"""PCB-07 fixture rehearsal, not operational recovery or an HTTP fault test.

Client response loss and later fixture-custodian inspection are separate views.
Generated keys and independently retained pins are synthetic trust assumptions.
"""
import copy
import hashlib
import json
import sqlite3
import unittest
from pathlib import Path

import test_purchase_completion as completion
from aps_governance.contracts import sha
from aps_governance.gateway import purchase_binding, verify_receipts
from aps_governance.signing import new_key
from aps_governance.store import get


EXPECTED_STATE = {
    'version': 5, 'demand': 21, 'stock': 20, 'quantity': 1,
    'supplier': 'sandbox-supplier', 'quote': 5,
    'authorization': 'sandbox:sandbox-supplier:1:5',
    'orders': ['SIMULATED:sandbox:sandbox-supplier:1:5']}


def reconcile_fixture(snapshot_path, receipt_public_key, *, task_id,
                      request_hash, trusted_head, trusted_count):
    """Read only a closed standalone static snapshot, never a live WAL database.

    Caller retains the key and exact snapshot head/count separately. Replacement
    of both evidence and pins by their owner is outside this synthetic model.
    No gateway calls, authority issuance, creation or recovery effects occur here.
    """
    def unknown(reason):
        return {'status': 'unknown', 'reason': reason, 'state': None}

    if (receipt_public_key is None or not isinstance(task_id, str) or not task_id
            or not isinstance(request_hash, str) or len(request_hash) != 64
            or not isinstance(trusted_head, str) or len(trusted_head) != 64
            or type(trusted_count) is not int or trusted_count < 1):
        return unknown('Missing or malformed independent trust inputs')
    try:
        path = Path(snapshot_path).resolve()
        if not path.is_file():
            return unknown('Snapshot absent')
        db = sqlite3.connect(path.as_uri() + '?mode=ro&immutable=1', uri=True)
        try:
            rows = db.execute('SELECT sequence,body FROM receipts ORDER BY sequence').fetchall()
            chain = [json.loads(row[1]) for row in rows]
            head = verify_receipts(chain, receipt_public_key)
            if (len(chain) != trusted_count or head != trusted_head
                    or [r[0] for r in rows] != list(range(1, len(chain) + 1))):
                return unknown('Independent exact snapshot head/count mismatch')
            matching = [r for r in chain if r['request_hash'] == request_hash]
            if len(matching) != 1:
                return unknown('Original request evidence absent or ambiguous')
            receipt = matching[0]
            scope = {'task_id': task_id, 'actor': 'purchase',
                     'action': 'purchase_mock', 'resource': 'procurement:' + task_id,
                     'decision': 'allow', 'executed': True, 'cached': False}
            if any(receipt[k] != value for k, value in scope.items()):
                return unknown('Original executed purchase scope/flags mismatch')
            purchases = [r for r in chain if r['task_id'] == task_id
                         and r['action'] == 'purchase_mock' and r['executed']]
            if purchases != [receipt]:
                return unknown('Executed purchase is not unique')
            task = get(db, 'tasks', 'id', task_id)
            approval = get(db, 'approvals', 'task', task_id)
            if not task or not approval:
                return unknown('Retained task or approval absent')
            state = task['state']
            if (task['id'] != task_id or task['stage'] != 5 or task['spent'] != 5
                    or task['demand_input'] != 21 or state != EXPECTED_STATE
                    or receipt['result_hash'] != sha(state)):
                return unknown('Signed result and retained mock completion mismatch')
            if (approval['actor'] != 'finance' or approval['consumed'] is not True
                    or approval['policy_digest'] != receipt['policy_digest']
                    or approval['binding'] != purchase_binding(task, receipt['policy_digest'])):
                return unknown('Consumed finance approval inconsistent')
            cached = db.execute('SELECT state FROM idempotency WHERE task=? AND actor=?',
                                (task_id, 'purchase')).fetchall()
            if len(cached) != 1 or json.loads(cached[0][0]) != state:
                return unknown('Retained idempotency result inconsistent')
            return {'status': 'committed_mock',
                    'reason': 'Anchored full chain binds original purchase to retained mock state',
                    'state': state}
        finally:
            db.close()
    except Exception as exc:
        return unknown('Evidence could not be verified: ' + type(exc).__name__)


class PurchaseLostResponseTests(unittest.TestCase):
    def setUp(self):
        # Module composition avoids inherited or imported duplicate test discovery.
        self.f = completion.PurchaseCompletionTests(methodName='runTest')
        self.addCleanup(self.f.doCleanups)
        self.f.setUp()

    def effects(self):
        tables = ('tasks', 'approvals', 'idempotency', 'capabilities',
                  'human_grants', 'reviews', 'contexts', 'identities', 'meta')
        with self.f.store.transaction() as db:
            return {table: db.execute(f'SELECT * FROM {table} ORDER BY 1,2').fetchall()
                    for table in tables}

    def lose_response(self):
        self.f.ready(21)
        self.before_task = self.f.task()
        self.before_approval = self.f.approval()
        self.assertEqual(self.before_task['stage'], 4)
        self.assertEqual(self.before_task['state']['quantity'], 1)
        self.assertEqual(self.before_task['state']['quote'], 5)
        self.assertIs(self.before_approval['consumed'], False)
        original = self.f.body('purchase')
        # Real call exits COMMIT before returning. The simulated client discards
        # the returned object completely and retains original request metadata.
        self.f.call(original)
        return copy.deepcopy(original)

    def custodian_commit(self, original):
        # Separate privileged custodian view, never the discarded response.
        expected = copy.deepcopy(self.before_task)
        expected.update(stage=5, spent=5, state=copy.deepcopy(EXPECTED_STATE))
        self.assertEqual(self.f.task(), expected)
        self.assertEqual(self.f.approval(), dict(self.before_approval, consumed=True))
        with self.f.store.transaction() as db:
            chain = [json.loads(r[0]) for r in db.execute(
                'SELECT body FROM receipts ORDER BY sequence')]
        self.assertEqual(verify_receipts(chain, self.f.receipt_key.public_key()), sha(chain[-1]))
        receipt = chain[-1]
        self.assertEqual(receipt['request_hash'], sha(original))
        self.assertEqual(receipt['result_hash'], sha(EXPECTED_STATE))
        for k, value in {'actor': 'purchase', 'task_id': 'task',
                         'resource': 'procurement:task', 'action': 'purchase_mock',
                         'decision': 'allow', 'executed': True, 'cached': False,
                         'issued_at': self.f.now}.items():
            self.assertEqual(receipt[k], value)
        return expected['state']

    def retry_boundary(self, offset):
        original = self.lose_response()
        retained = self.custodian_commit(original)
        before = self.effects()
        self.f.now = self.f.approval()['expires'] + offset
        self.assertLess(self.f.now, self.f.task()['expires'])
        retry = self.f.retry(original)
        self.assertEqual(retry['state_version'], 4)
        response = self.f.call(retry)
        self.f.receipt(response, retry, decision='allow' if offset < 0 else 'deny',
                       executed=False, cached=True)
        self.assertEqual(response['receipt']['reason'],
                         'idempotent_result' if offset < 0 else 'approval_expired')
        self.assertEqual(response['state'], retained if offset < 0 else None)
        self.assertEqual(self.effects(), before,
                         'No additional order/spend/stage/approval/authority/context effects')
        return original

    def snapshot(self):
        # Backup yields a standalone closed database. Capture independent pins
        # before tampering, never derive trusted pins inside reconcile_fixture.
        path = Path(self.f.tmp.name) / 'snapshot.sqlite'
        source = sqlite3.connect(self.f.store.path)
        target = sqlite3.connect(path)
        try:
            source.backup(target)
            target.commit()
            chain = [json.loads(r[0]) for r in target.execute(
                'SELECT body FROM receipts ORDER BY sequence')]
            self.anchor = {'trusted_head': verify_receipts(
                chain, self.f.receipt_key.public_key()), 'trusted_count': len(chain)}
        finally:
            target.close()
            source.close()
        return path

    def tree_hashes(self):
        root = Path(self.f.tmp.name)
        return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
                for p in root.rglob('*') if p.is_file()}

    def reconcile(self, path, original, status, **overrides):
        args = dict(task_id='task', request_hash=sha(original), **self.anchor)
        key = overrides.pop('receipt_public_key', self.f.receipt_key.public_key())
        args.update(overrides)
        before = self.tree_hashes()
        result = reconcile_fixture(path, key, **args)
        self.assertEqual(self.tree_hashes(), before, 'Entire fixture tree stays byte-identical')
        self.assertEqual(result['status'], status, result['reason'])
        self.assertTrue(result['reason'])
        self.assertEqual(result['state'], EXPECTED_STATE if status == 'committed_mock' else None)
        return result

    def evidence_fixture(self):
        original = self.lose_response()
        self.custodian_commit(original)
        return original, self.snapshot()

    def mutate_copy(self, path, sql, args=()):
        # Only the copied evidence is corrupted, after custodian pin capture.
        damaged = path.with_name('damaged.sqlite')
        source = sqlite3.connect(path)
        target = sqlite3.connect(damaged)
        try:
            source.backup(target)
            target.execute(sql, args)
            target.commit()
        finally:
            target.close()
            source.close()
        return damaged

    def test_lost_response_commits_once(self):
        original = self.lose_response()
        self.custodian_commit(original)
        self.reconcile(self.snapshot(), original, 'committed_mock')

    def test_before_expiry_retry_returns_cached(self):
        self.retry_boundary(-1)

    def test_at_expiry_retry_denied(self):
        self.retry_boundary(0)

    def test_after_expiry_retry_denied(self):
        self.retry_boundary(1)

    def test_readonly_reconciliation_confirms_committed_mock(self):
        original, path = self.evidence_fixture()
        self.reconcile(path, original, 'committed_mock')

    def test_expired_retry_then_readonly_reconciliation(self):
        original = self.retry_boundary(0)
        # Updated exact snapshot anchor includes legitimate denial receipt growth.
        self.reconcile(self.snapshot(), original, 'committed_mock')

    def test_missing_evidence_is_unknown(self):
        original, path = self.evidence_fixture()
        self.reconcile(path.with_name('absent.sqlite'), original, 'unknown')
        self.assertFalse(path.with_name('absent.sqlite').exists())
        damaged = self.mutate_copy(path, 'DELETE FROM receipts')
        self.reconcile(damaged, original, 'unknown')

    def test_tampered_receipt_is_unknown(self):
        original, path = self.evidence_fixture()
        with sqlite3.connect(path) as db:
            r = json.loads(db.execute('SELECT body FROM receipts ORDER BY sequence DESC LIMIT 1').fetchone()[0])
        r['reason'] = 'tampered'
        damaged = self.mutate_copy(path, 'UPDATE receipts SET body=? WHERE sequence=?',
                                   (json.dumps(r), r['sequence']))
        self.reconcile(damaged, original, 'unknown')

    def test_truncated_receipt_tail_is_unknown(self):
        original, path = self.evidence_fixture()
        damaged = self.mutate_copy(path, 'DELETE FROM receipts WHERE sequence=(SELECT MAX(sequence) FROM receipts)')
        self.reconcile(damaged, original, 'unknown')

    def test_state_receipt_mismatch_is_unknown(self):
        original, path = self.evidence_fixture()
        task = self.f.task()
        task['state']['orders'] = []
        damaged = self.mutate_copy(path, 'UPDATE tasks SET body=? WHERE id=?',
                                   (json.dumps(task), 'task'))
        self.reconcile(damaged, original, 'unknown')

    def test_wrong_receipt_key_is_unknown(self):
        original, path = self.evidence_fixture()
        self.reconcile(path, original, 'unknown', receipt_public_key=new_key().public_key())

    def test_missing_trust_anchor_is_unknown(self):
        original, path = self.evidence_fixture()
        self.reconcile(path, original, 'unknown', trusted_head=None, trusted_count=None)

    def test_scope_mismatch_is_unknown(self):
        original, path = self.evidence_fixture()
        self.reconcile(path, original, 'unknown', task_id='other-task')


if __name__ == '__main__':
    unittest.main()
