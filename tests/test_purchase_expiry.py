"""PCB-06 current admission-time boundaries, not effect/commit validity.

Synthetic one-field TTL injection isolates guards in disposable stores only.
Shortening task TTL intentionally breaks the naturally coupled issuance TTL
hierarchy. This is not a normal administration issuance claim or product API.
No moving clock, delayed evaluator, second clock sample or external effect.
"""
import copy
import json
import tempfile
import unittest
from pathlib import Path

from aps_governance.admin import Administration
from aps_governance.contracts import ROOT, sha
from aps_governance.demo import request
from aps_governance.gateway import Gateway, verify_receipts
from aps_governance.policy import PolicyEngine
from aps_governance.signing import new_key
from aps_governance.store import Store, get


class FixedClock:
    def __init__(self):
        self.value = 2000000000
        self.calls = 0

    def __call__(self):
        self.calls += 1
        return self.value


class PurchaseExpiryBoundaryTests(unittest.TestCase):
    T = 2000000030

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='pcb06-')
        self.addCleanup(self.tmp.cleanup)
        self.store = Store(Path(self.tmp.name) / 'fixture.sqlite')
        self.store.initialize()
        self.clock = FixedClock()
        self.engine = PolicyEngine(ROOT / 'policies/v1')
        self.admin = Administration(self.store, new_key())
        self.receipt_key = new_key()
        self.admin.activate(
            self.engine,
            {'schema_version': '2.0', 'report_digest': sha({}), 'requirements': []},
            'test-bootstrap', 'Disposable PCB-06 fixture only', baseline=True)
        self.g = Gateway(self.store, self.engine, self.receipt_key, clock=self.clock)
        self.c = self.admin.provision('task', demand=21, stock=20,
                                      now=self.clock.value)
        self.version = 0

    def body(self, actor, **kwargs):
        return request(actor, 'task', self.c['context_id'],
                       version=self.version, **kwargs)

    def call(self, body):
        return self.g.call(self.c['tokens'][body['actor']], body)

    def task(self):
        with self.store.transaction() as db:
            return get(db, 'tasks', 'id', 'task')

    def approval(self):
        with self.store.transaction() as db:
            return get(db, 'approvals', 'task', 'task')

    def effects(self):
        # Nonces and receipts are legitimate audit writes. Snapshot all business
        # authority tables, plus contexts, without omitting unchanged columns.
        with self.store.transaction() as db:
            return {table: db.execute(f'SELECT * FROM {table} ORDER BY 1,2').fetchall()
                    for table in ('tasks', 'approvals', 'idempotency',
                                  'capabilities', 'human_grants', 'reviews',
                                  'contexts')}

    def receipt(self, response, body, *, decision, executed):
        r = response['receipt']
        self.assertEqual(r['decision'], decision, r['reason'])
        self.assertIs(r['executed'], executed)
        self.assertIs(r['cached'], False)
        self.assertEqual(r['request_hash'], sha(body))
        self.assertEqual(r['result_hash'], sha(response['state']))
        self.assertEqual(r['actor'], body['actor'])
        self.assertEqual(r['task_id'], body['task_id'])
        self.assertEqual(r['resource'], body['resource'])
        self.assertEqual(r['action'], body['action'])
        self.assertEqual(r['issued_at'], self.clock.value)
        self.assertEqual(r['policy_digest'], self.engine.digest)
        self.assertEqual(r['policy_version'], self.engine.version)
        with self.store.transaction() as db:
            chain = [json.loads(row[0]) for row in
                     db.execute('SELECT body FROM receipts ORDER BY sequence')]
        self.assertEqual(chain[-1], r)
        self.assertEqual(verify_receipts(chain, self.receipt_key.public_key()), sha(r))

    def ready(self):
        for actor in ('demand', 'inventory', 'supplier', 'finance', 'purchase'):
            b = self.body('orchestrator', action='delegate_mock', depth=0, target=actor)
            self.receipt(self.call(b), b, decision='allow', executed=True)
            if actor != 'purchase':
                b = self.body(actor, value=21 if actor == 'demand' else 0)
                r = self.call(b)
                self.receipt(r, b, decision='allow', executed=True)
                self.version = r['state']['version']
        self.assertEqual(self.clock.value, 2000000000)
        self.assertEqual(self.task()['stage'], 4)
        self.assertEqual(self.task()['spent'], 0)
        self.assertEqual(self.task()['demand_input'], 21)
        self.assertEqual(self.task()['state'], {
            'version': 4, 'demand': 21, 'stock': 20, 'quantity': 1,
            'supplier': 'sandbox-supplier', 'quote': 5,
            'authorization': 'sandbox:sandbox-supplier:1:5', 'orders': []})
        self.assertEqual(self.approval()['actor'], 'finance')
        self.assertIs(self.approval()['consumed'], False)

    def expiries(self):
        with self.store.transaction() as db:
            cap = json.loads(db.execute(
                'SELECT body FROM capabilities WHERE task=? AND actor=?',
                ('task', 'purchase')).fetchone()[0])
            return {'task': get(db, 'tasks', 'id', 'task')['expires'],
                    'context': get(db, 'contexts', 'id', self.c['context_id'])['expires'],
                    'capability': cap['expires'],
                    'approval': get(db, 'approvals', 'task', 'task')['expires']}

    def shorten(self, gate):
        # Deliberate synthetic field injection, never a live administration API.
        original = self.expiries()
        self.assertTrue(all(value > self.T + 1 for value in original.values()))
        with self.store.transaction() as db:
            if gate == 'capability':
                row = db.execute('SELECT body FROM capabilities WHERE task=? AND actor=?',
                                 ('task', 'purchase')).fetchone()
                value = json.loads(row[0])
                value['expires'] = self.T
                db.execute('UPDATE capabilities SET body=? WHERE task=? AND actor=?',
                           (json.dumps(value), 'task', 'purchase'))
            else:
                table, column, key = {
                    'task': ('tasks', 'id', 'task'),
                    'context': ('contexts', 'id', self.c['context_id']),
                    'approval': ('approvals', 'task', 'task')}[gate]
                value = get(db, table, column, key)
                value['expires'] = self.T
                db.execute(f'UPDATE {table} SET body=? WHERE {column}=?',
                           (json.dumps(value), key))
        expected = dict(original, **{gate: self.T})
        self.assertEqual(self.expiries(), expected)
        for other, expiry in expected.items():
            if other != gate:
                self.assertGreater(expiry, self.T + 1)

    def boundary(self, gate, offset):
        self.ready()
        self.shorten(gate)
        before_task = self.task()
        before_approval = self.approval()
        before_effects = self.effects()
        b = self.body('purchase')
        self.assertEqual(b['state_version'], 4)
        with self.store.transaction() as db:
            self.assertEqual(db.execute(
                'SELECT COUNT(*) FROM idempotency WHERE task=? AND actor=?',
                ('task', 'purchase')).fetchone()[0], 0)
        self.clock.value = self.T + offset
        self.clock.calls = 0
        r = self.call(b)
        self.assertEqual(self.clock.calls, 1, 'one admission clock sample per final call')
        if offset < 0:
            self.receipt(r, b, decision='allow', executed=True)
            self.assertEqual(r['receipt']['reason'], 'policy_allow')
            expected = copy.deepcopy(before_task)
            expected.update(stage=5, spent=5)
            expected['state']['version'] = 5
            expected['state']['orders'] = ['SIMULATED:sandbox:sandbox-supplier:1:5']
            self.assertEqual(self.task(), expected)
            self.assertEqual(r['state'], expected['state'])
            self.assertEqual(self.approval(), dict(before_approval, consumed=True))
        else:
            self.receipt(r, b, decision='deny', executed=False)
            self.assertEqual(r['receipt']['reason'], {
                'task': 'task_expired', 'context': 'context_provenance',
                'capability': 'capability_scope', 'approval': 'approval_invalid'}[gate])
            self.assertIsNone(r['state'])
            self.assertEqual(self.effects(), before_effects,
                             'no order, spend, stage, approval or authority mutation')

    def test_task_before_expiry_allows(self):
        self.boundary('task', -1)

    def test_task_at_expiry_denies(self):
        self.boundary('task', 0)

    def test_task_after_expiry_denies(self):
        self.boundary('task', 1)

    def test_context_before_expiry_allows(self):
        self.boundary('context', -1)

    def test_context_at_expiry_denies(self):
        self.boundary('context', 0)

    def test_context_after_expiry_denies(self):
        self.boundary('context', 1)

    def test_capability_before_expiry_allows(self):
        self.boundary('capability', -1)

    def test_capability_at_expiry_denies(self):
        self.boundary('capability', 0)

    def test_capability_after_expiry_denies(self):
        self.boundary('capability', 1)

    def test_approval_before_expiry_allows(self):
        self.boundary('approval', -1)

    def test_approval_at_expiry_denies(self):
        self.boundary('approval', 0)

    def test_approval_after_expiry_denies(self):
        self.boundary('approval', 1)


if __name__ == '__main__':
    unittest.main()
