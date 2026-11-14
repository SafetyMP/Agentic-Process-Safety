"""PCB-05 engineering tests: completion is distinct from physical fulfillment.

Only disposable databases and newly generated test keys are used. Real gateway
transactions evaluate the unchanged, signed procurement Rego policy through OPA.
These assertions are evidence for later human review, not formal acceptance.
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


class PurchaseCompletionTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='pcb05-')
        self.addCleanup(self.tmp.cleanup)
        self.store = Store(Path(self.tmp.name) / 'fixture.sqlite')
        self.store.initialize()
        self.now = 2000000000
        self.engine = PolicyEngine(ROOT / 'policies/v1')
        self.admin = Administration(self.store, new_key())
        self.receipt_key = new_key()
        self.admin.activate(
            self.engine,
            {'schema_version': '2.0', 'report_digest': sha({}), 'requirements': []},
            'test-bootstrap', 'Disposable PCB-05 test fixture only', baseline=True)
        self.g = Gateway(self.store, self.engine, self.receipt_key,
                         clock=lambda: self.now)
        self.version = 0

    def provision(self, demand):
        self.c = self.admin.provision('task', demand=demand, stock=20, now=self.now)

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
        # Nonces and signed audit receipts legitimately grow on denied/retry calls.
        # Everything describing business effects and authorization must stay equal.
        with self.store.transaction() as db:
            return {table: db.execute(f'SELECT * FROM {table} ORDER BY 1,2').fetchall()
                    for table in ('tasks', 'approvals', 'idempotency',
                                  'capabilities', 'human_grants', 'reviews')}

    def receipt(self, response, body, *, decision, executed, cached):
        r = response['receipt']
        self.assertEqual(r['decision'], decision, r['reason'])
        self.assertIs(r['executed'], executed, 'executed describes adapter transition')
        self.assertIs(r['cached'], cached, 'cache flag must match request history')
        self.assertEqual(r['request_hash'], sha(body), 'receipt must bind actual request')
        self.assertEqual(r['result_hash'], sha(response['state']))
        self.assertEqual(r['actor'], body['actor'])
        self.assertEqual(r['task_id'], 'task')
        self.assertEqual(r['resource'], body['resource'])
        self.assertEqual(r['action'], body['action'])
        self.assertEqual(r['issued_at'], self.now)
        self.assertEqual(r['policy_digest'], self.engine.digest)
        self.assertEqual(r['policy_version'], self.engine.version)
        with self.store.transaction() as db:
            chain = [json.loads(row[0]) for row in
                     db.execute('SELECT body FROM receipts ORDER BY sequence')]
        self.assertEqual(chain[-1], r, 'returned receipt must be persisted exactly')
        self.assertEqual(verify_receipts(chain, self.receipt_key.public_key()), sha(r))

    def delegate(self, actor):
        b = self.body('orchestrator', action='delegate_mock', depth=0, target=actor)
        self.receipt(self.call(b), b, decision='allow', executed=True, cached=False)

    def ready(self, demand, *, finance=True):
        self.provision(demand)
        for actor in ('demand', 'inventory', 'supplier') + (('finance',) if finance else ()):
            self.delegate(actor)
            b = self.body(actor, value=demand if actor == 'demand' else 0)
            r = self.call(b)
            self.receipt(r, b, decision='allow', executed=True, cached=False)
            self.version = r['state']['version']
        self.delegate('purchase')

    def complete(self, demand, quantity):
        self.ready(demand)
        before = self.task()
        approval_before = self.approval()
        self.assertEqual(before['demand_input'], demand)
        self.assertEqual(before['stage'], 4, 'finance must precede purchase')
        self.assertEqual(before['spent'], 0)
        expected = {'version': 4, 'demand': demand, 'stock': 20,
                    'quantity': quantity, 'supplier': 'sandbox-supplier',
                    'quote': quantity * 5,
                    'authorization': f'sandbox:sandbox-supplier:{quantity}:{quantity * 5}',
                    'orders': []}
        self.assertEqual(before['state'], expected, 'real prerequisite adapters establish inputs')
        self.assertEqual(approval_before['actor'], 'finance')
        self.assertIs(approval_before['consumed'], False)
        b = self.body('purchase')
        r = self.call(b)
        self.receipt(r, b, decision='allow', executed=True, cached=False)
        expected['version'] = 5
        expected['orders'] = ([] if quantity == 0 else
                              ['SIMULATED:sandbox:sandbox-supplier:1:5'])
        expected_task = copy.deepcopy(before)
        expected_task.update(stage=5, spent=quantity * 5, state=expected)
        self.assertEqual(self.task(), expected_task,
                         'completion advances exactly once with only the expected spend/order')
        self.assertEqual(r['state'], expected, 'response must equal persisted completed state')
        expected_approval = dict(approval_before, consumed=True)
        self.assertEqual(self.approval(), expected_approval,
                         'even zero-quantity completion consumes the original approval')
        return b, r

    def retry(self, original):
        b = copy.deepcopy(original)
        b['nonce'] = 'fresh-retry-nonce'
        b['request_id'] = 'fresh-retry-request'
        self.assertNotEqual(b['nonce'], original['nonce'])
        self.assertNotEqual(b['request_id'], original['request_id'])
        self.assertEqual({k: v for k, v in b.items() if k not in ('nonce', 'request_id')},
                         {k: v for k, v in original.items() if k not in ('nonce', 'request_id')})
        return b

    def cached_retry(self, original, first):
        before = self.effects()
        b = self.retry(original)
        r = self.call(b)
        self.receipt(r, b, decision='allow', executed=False, cached=True)
        self.assertEqual(r['receipt']['reason'], 'idempotent_result')
        self.assertEqual(r['state'], first['state'], 'matching retry returns original result')
        self.assertEqual(self.effects(), before, 'cached retry must not repeat any effect')

    def denied_without_effect(self, b, reason, *, cached=False):
        before = self.effects()
        r = self.call(b)
        self.receipt(r, b, decision='deny', executed=False, cached=cached)
        self.assertIn(reason, r['receipt']['reason'])
        self.assertIsNone(r['state'], 'denial must not present a successful result')
        self.assertEqual(self.effects(), before, 'denial must preserve business state and approval')

    def test_zero_demand_completion(self):
        self.complete(0, 0)

    def test_demand_below_stock_completion(self):
        self.complete(19, 0)

    def test_demand_equal_stock_completion(self):
        self.complete(20, 0)

    def test_positive_quantity_completes_once(self):
        b, first = self.complete(21, 1)
        self.cached_retry(b, first)

    def test_zero_quantity_cached_retry(self):
        b, first = self.complete(0, 0)
        self.cached_retry(b, first)

    def test_zero_quantity_replay_denied(self):
        b, _ = self.complete(0, 0)
        self.denied_without_effect(b, 'replay')

    def test_zero_quantity_expired_retry_denied(self):
        b, _ = self.complete(0, 0)
        self.now = self.approval()['expires']
        self.assertEqual(self.now, 2000000000 + self.engine.config['approval_ttl'])
        self.assertLess(self.now, self.task()['expires'], 'isolate approval expiry from task expiry')
        self.denied_without_effect(self.retry(b), 'approval_expired', cached=True)

    def test_zero_quantity_requires_finance_approval(self):
        self.ready(0)
        # Deliberately absent authorization in this disposable fixture, before any
        # purchase effect: retain completed prerequisites to isolate approval denial.
        with self.store.transaction() as db:
            db.execute('DELETE FROM approvals WHERE task=?', ('task',))
        self.assertEqual(self.task()['stage'], 4)
        self.assertEqual(self.task()['state']['quantity'], 0)
        self.assertIsNone(self.approval())
        self.denied_without_effect(self.body('purchase'), 'approval_invalid')

    def test_zero_quantity_requires_prerequisites(self):
        self.provision(0)
        self.delegate('purchase')
        self.assertEqual(self.task()['stage'], 0)
        self.assertEqual(self.task()['state']['version'], 0)
        self.assertEqual(self.task()['state']['quantity'], 0)
        self.denied_without_effect(self.body('purchase'), 'prerequisite')

    def test_zero_quantity_conflicting_retry_denied(self):
        b, _ = self.complete(0, 0)
        conflict = self.retry(b)
        conflict['payload']['value'] = 1
        self.denied_without_effect(conflict, 'idempotency_conflict')


if __name__ == '__main__':
    unittest.main()
