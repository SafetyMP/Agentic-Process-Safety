import copy
import json
import random
import sqlite3
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch
from cryptography.exceptions import InvalidSignature
from aps.core import analyze, review
from aps_governance.admin import Administration
from aps_governance.contracts import ROOT, sha, validate
from aps_governance.demo import request
from aps_governance.gateway import Gateway, verify_receipts
from aps_governance.policy import PolicyEngine
from aps_governance.signing import new_key, public_hex
from aps_governance.store import Store, get
from aps_governance.traceability import propose, approve_requirement, check_trace

class GovernanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.store=Store(Path(self.tmp.name)/'state.db'); self.store.initialize()
        self.admin_key=new_key(); self.receipt_key=new_key(); self.engine=PolicyEngine(ROOT/'policies/v1')
        self.admin=Administration(self.store,self.admin_key)
        self.trace={'schema_version':'2.0','report_digest':sha({}),'requirements':[]}
        self.admin.activate(self.engine,self.trace,'test-bootstrap','Synthetic test fixture only',baseline=True)
        self.now=2000000000
        self.c=self.admin.provision('task',now=self.now)
        self.g=Gateway(self.store,self.engine,self.receipt_key,clock=lambda:self.now)
        self.version=0
    def signed_fault_fixture(self, *, rego=None, config=None):
        """Sign faulty effective bytes in an isolated synthetic sandbox."""
        bundle=Path(self.tmp.name)/('fixture-'+str(len(list(Path(self.tmp.name).iterdir()))))
        bundle.mkdir()
        (bundle/'procurement.rego').write_bytes(rego if rego is not None else self.engine.rego)
        (bundle/'config.json').write_text(json.dumps(config if config is not None else self.engine.config))
        self.engine=PolicyEngine(bundle)
        self.store=Store(bundle/'state.db');self.store.initialize()
        self.admin=Administration(self.store,self.admin_key)
        self.admin.activate(self.engine,self.trace,'fixture-human','SIGNED FAULTY SYNTHETIC TEST ONLY',baseline=True)
        self.c=self.admin.provision('task',now=self.now)
        self.g=Gateway(self.store,self.engine,self.receipt_key,clock=lambda:self.now)
        if rego is not None:
            with self.store.transaction() as db:
                db.execute('INSERT INTO capabilities VALUES (?,?,?)',('task','demand',json.dumps({'depth':1,'expires':self.now+300,'parent':'orchestrator'})))
        self.version=0

    def body(self,actor,**kwargs): return request(actor,'task',self.c['context_id'],version=self.version,**kwargs)
    def call(self,body,token=None): return self.g.call(token or self.c['tokens'].get(body.get('actor'), 'invalid'),body)
    def delegate(self,actor):
        r=self.call(self.body('orchestrator',action='delegate_mock',depth=0,target=actor));self.allow(r);return r
    def step(self,actor):
        self.delegate(actor)
        r=self.call(self.body(actor,value=100 if actor=='demand' else 0))
        self.allow(r);self.version=r['state']['version'];return r
    def ready(self,finance=True):
        for actor in ['demand','inventory','supplier']+(['finance'] if finance else []): self.step(actor)
        if finance:self.delegate('purchase')
    def allow(self,r): self.assertEqual(r['receipt']['decision'],'allow',r['receipt']['reason'])
    def deny(self,r,reason=None):
        self.assertEqual(r['receipt']['decision'],'deny',r)
        self.assertFalse(r['receipt']['executed'])
        if reason:self.assertIn(reason,r['receipt']['reason'])
    def read_task(self):
        with self.store.transaction() as db:return get(db,'tasks','id','task')
    def mutate(self,table,body):
        with self.store.transaction() as db:db.execute(f'UPDATE {table} SET body=?',(json.dumps(body),))
    def test_authorized_workflow(self):
        self.ready();r=self.call(self.body('purchase'));self.allow(r)
        self.assertEqual(r['state']['orders'],['SIMULATED:sandbox:sandbox-supplier:80:400'])
        self.assertEqual(self.read_task()['spent'],400)
    def test_scope(self):
        self.delegate('supplier')
        self.deny(self.call(self.body('supplier',action='finance_mock')),'tool_allowlist')
        self.deny(self.call(self.body('finance'),token=self.c['tokens']['supplier']),'identity')
        self.deny(self.call(self.body('unknown')),'identity')
        self.deny(self.call(self.body('demand')),'capability_scope')
    def test_task_resource_scope(self):
        b=self.body('demand');b['task_id']='another';self.deny(self.call(b),'unknown_task')
        b=self.body('demand');b['resource']='procurement:another';self.deny(self.call(b),'resource_scope')
    def test_depth(self):
        config=self.engine.config;config['max_depth']=0
        self.signed_fault_fixture(config=config)
        self.deny(self.call(self.body('orchestrator',action='delegate_mock',depth=0,target='demand')),'delegation_depth')
        self.delegate_reset_for_depth()
    def delegate_reset_for_depth(self):
        config=self.engine.config;config['max_depth']=3
        self.signed_fault_fixture(config=config);self.delegate('demand')
        self.deny(self.call(self.body('demand',depth=3,value=100)),'capability_scope')
        self.deny(self.call(self.body('demand',action='delegate_mock',target='finance')),'tool_allowlist')
        self.deny(self.call(self.body('orchestrator',action='delegate_mock',depth=0,target='orchestrator')),'adapter_contract')
    def test_unsigned_policy_mutation_cannot_change_effective_snapshot(self):
        digest=self.engine.digest
        config=self.engine.config
        config['max_depth']=0
        config['allowlists']['orchestrator']=[]
        self.assertNotEqual(config,self.engine.config)
        for field,value in [('rego',b'package elsewhere'),('config',config),
                            ('digest','0'*64),('version','forged'),
                            ('_rego',b'package elsewhere'),('_config','{}')]:
            with self.assertRaises(AttributeError):setattr(self.engine,field,value)
        r=self.delegate('demand')
        self.assertEqual(r['receipt']['policy_digest'],digest)
        self.deny(self.call(self.body('demand',action='finance_mock')),'tool_allowlist')
        self.assertEqual(self.read_task()['stage'],0)

    def test_context(self):
        self.delegate('demand');b=self.body('demand',value=100);b['context_id']='agent-says-human-approved'
        self.deny(self.call(b),'context_provenance')
        with self.store.transaction() as db:db.execute('DELETE FROM contexts')
        self.deny(self.call(self.body('demand',value=100)),'context_provenance')
    def test_state(self):
        self.delegate('demand');b=self.body('demand',value=100);b['state_version']=1
        self.deny(self.call(b),'state_mismatch');self.assertEqual(self.read_task()['state']['version'],0)
    def test_order(self):
        self.delegate('purchase');self.deny(self.call(self.body('purchase')),'prerequisite')
    def test_caps(self):
        self.ready(finance=False);self.delegate('finance')
        t=self.read_task();t['budget']=399;self.mutate('tasks',t)
        self.deny(self.call(self.body('finance')),'spending_cap')
        t['budget']=400;self.mutate('tasks',t);self.allow(self.call(self.body('finance')))
    def test_policy_cap_boundary(self):
        self.ready(finance=False);self.delegate('finance')
        t=self.read_task();t['state']['quote']=1001;t['budget']=2000;self.mutate('tasks',t)
        self.deny(self.call(self.body('finance')),'spending_cap')
        t['state']['quote']=1000;self.mutate('tasks',t)
        self.assertEqual(self.call(self.body('finance'))['receipt']['decision'],'review_required')
    def test_threshold_and_human_separation(self):
        self.ready(finance=False);self.delegate('finance')
        t=self.read_task();t['state']['quote']=500;self.mutate('tasks',t)
        self.allow(self.call(self.body('finance')))
    def test_review_required_then_external_approval(self):
        self.ready(finance=False);self.delegate('finance')
        t=self.read_task();t['state']['quote']=501;self.mutate('tasks',t)
        r=self.call(self.body('finance'));self.assertEqual(r['receipt']['decision'],'review_required')
        self.assertEqual(self.read_task()['stage'],3)
        with self.assertRaises(PermissionError):self.admin.approve_spend('task','finance','Self approval',True,now=self.now)
        self.admin.approve_spend('task','fixture-human','Synthetic human approval in test only',True,now=self.now)
        self.allow(self.call(self.body('finance')));self.version=4;self.delegate('purchase')
        self.allow(self.call(self.body('purchase')))
    def test_review_timeout(self):
        self.ready(finance=False);self.delegate('finance');t=self.read_task();t['state']['quote']=501;self.mutate('tasks',t)
        self.call(self.body('finance'));self.now+=self.engine.config['review_timeout']
        self.deny(self.call(self.body('finance')),'review_timeout_escalated')
        with self.assertRaises(ValueError):self.admin.approve_spend('task','fixture-human','Late',True,now=self.now)
    def test_approval(self):
        self.ready();
        with self.store.transaction() as db:db.execute('DELETE FROM approvals')
        self.deny(self.call(self.body('purchase')),'approval_invalid')
    def test_binding(self):
        self.ready();t=self.read_task();t['state']['quote']+=1;self.mutate('tasks',t)
        self.deny(self.call(self.body('purchase')),'approval_invalid')
    def test_sod(self):
        self.ready()
        with self.store.transaction() as db:a=get(db,'approvals','task','task')
        a['actor']='purchase';self.mutate('approvals',a)
        self.deny(self.call(self.body('purchase')),'separation_of_duties')
    def test_expiry(self):
        self.ready();self.now+=60;self.deny(self.call(self.body('purchase')),'approval_invalid')
    def test_task_expiry(self):
        self.now+=300;self.deny(self.call(self.body('demand',value=100)),'task_expired')
    def test_replay(self):
        self.ready();b=self.body('purchase');self.allow(self.call(b));self.deny(self.call(b),'replay')
        retry=copy.deepcopy(b);retry['nonce']='fresh';retry['request_id']='fresh'
        r=self.call(retry);self.allow(r);self.assertTrue(r['receipt']['cached']);self.assertFalse(r['receipt']['executed'])
        self.assertEqual(len(self.read_task()['state']['orders']),1)
        retry['nonce']='fresh2';retry['payload']['value']=1;self.deny(self.call(retry),'idempotency_conflict')
    def test_expired_cached_purchase_denied(self):
        self.ready();b=self.body('purchase');self.allow(self.call(b));self.now+=60;b['nonce']='after-expiry'
        self.deny(self.call(b),'approval_expired')
    def test_forged_human_grant_does_not_authorize(self):
        self.ready(finance=False);self.delegate('finance')
        t=self.read_task();t['state']['quote']=501;self.mutate('tasks',t)
        self.assertEqual(self.call(self.body('finance'))['receipt']['decision'],'review_required')
        grant=self.admin.approve_spend('task','fixture-human','SYNTHETIC TEST ONLY',True,now=self.now)
        grant['binding']='0'*64;self.mutate('human_grants',grant)
        self.assertEqual(self.call(self.body('finance'))['receipt']['decision'],'review_required')
        self.assertEqual(self.read_task()['stage'],3)
    def test_changed_quantity_or_supplier_invalidates_approval(self):
        self.ready();original=self.read_task()
        for key,value in [('quantity',81),('supplier','substitute')]:
            t=copy.deepcopy(original);t['state'][key]=value;self.mutate('tasks',t)
            self.deny(self.call(self.body('purchase')),'approval_invalid')
    def test_restart_retains_replay_and_idempotency(self):
        self.ready();b=self.body('purchase');self.call(b)
        self.g=Gateway(self.store,PolicyEngine(ROOT/'policies/v1'),self.receipt_key,clock=lambda:self.now)
        self.deny(self.call(b),'replay');b['nonce']='restart';self.allow(self.call(b))
    def test_concurrent_submission(self):
        self.ready();b=self.body('purchase')
        bodies=[]
        for i in range(8):q=copy.deepcopy(b);q['nonce']=f'n{i}';bodies.append(q)
        with ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(self.call,bodies))
        self.assertEqual(sum(r['receipt']['executed'] for r in results),1)
        self.assertTrue(all(r['receipt']['decision']=='allow' for r in results))
        self.assertEqual(self.read_task()['spent'],400)
    def test_malformed(self):
        for bad in [None,[],{}, {'actor':'demand'},True]: self.deny(self.g.call(self.c['tokens']['demand'],bad),'invalid_input')
        b=self.body('demand');b['human_approved']=True;self.deny(self.call(b),'invalid_input')
        b=self.body('demand');b['payload']['value']=True;self.deny(self.call(b),'invalid_input')
    def test_bounded_fuzz_inputs(self):
        # Seeded property-style tests: none of these malformed values may change state.
        rng=random.Random(42)
        for _ in range(80):
            b=self.body('demand',value=100);field=rng.choice(['state_version','delegation_depth','nonce','payload'])
            b[field]=rng.choice([-1,True,None,{},[],1.5])
            self.deny(self.call(b))
        self.assertEqual(self.read_task()['state']['version'],0)
    def test_outage(self):
        self.delegate('demand');self.g.engine=PolicyEngine(ROOT/'policies/v1',executable='/does-not-exist')
        self.deny(self.call(self.body('demand',value=100)),'policy_unavailable_or_error')
        self.assertEqual(self.read_task()['stage'],0)
    def test_timeout_and_policy_errors(self):
        self.delegate('demand');self.g.engine=PolicyEngine(ROOT/'policies/v1',timeout=0.000001)
        self.deny(self.call(self.body('demand',value=100)),'policy_unavailable_or_error')
        self.signed_fault_fixture(rego=b'package invalid !!!')
        self.deny(self.call(self.body('demand',value=100)),'policy_unavailable_or_error')
    def test_undefined_and_builtin_errors(self):
        self.signed_fault_fixture(rego=b'package elsewhere\n')
        self.deny(self.call(self.body('demand',value=100)),'policy_unavailable_or_error')
        self.signed_fault_fixture(rego=b'package aps.procurement\nimport rego.v1\ndecision := 1 / 0\n')
        self.deny(self.call(self.body('demand',value=100)),'policy_unavailable_or_error')
    def test_receipt_signatures_and_chain(self):
        self.ready();self.call(self.body('purchase'))
        with self.store.transaction() as db:receipts=[json.loads(r[0]) for r in db.execute('SELECT body FROM receipts ORDER BY sequence')]
        verify_receipts(receipts,self.receipt_key.public_key())
        for field,value in [('actor','supplier'),('request_hash','0'*64),('resource','other'),('action','finance_mock'),('policy_version','other'),('policy_digest','0'*64),('result_hash','0'*64),('executed',False),('decision','deny')]:
            forged=copy.deepcopy(receipts);forged[0][field]=value
            with self.assertRaises(InvalidSignature):verify_receipts(forged,self.receipt_key.public_key())
        with self.assertRaises(ValueError):verify_receipts(receipts[1:],self.receipt_key.public_key())
    def test_atomic_receipt_failure(self):
        self.delegate('demand')
        with patch.object(self.g,'_record',side_effect=RuntimeError('disk error')):
            with self.assertRaises(RuntimeError):self.call(self.body('demand',value=100))
        self.assertEqual(self.read_task()['stage'],0)
    def test_admin_and_unsigned_policy(self):
        with self.assertRaises(PermissionError):Administration(self.store,new_key())
        with self.assertRaises(PermissionError):self.admin.activate(self.engine,self.trace,'demand','Self approval',True)
        with self.assertRaises(PermissionError):self.admin.activate(self.engine,self.trace,'bootstrap','Again',baseline=True)
        with self.store.transaction() as db:db.execute("UPDATE meta SET value='{}' WHERE key='active_manifest'")
        self.deny(self.call(self.body('demand',value=100)),'policy_changed_or_unsigned')
    def test_policy_simulation_no_side_effects(self):
        self.delegate('demand');before=self.read_task()
        facts={'actor':'purchase','action':'purchase_mock','identity_ok':True,'context_ok':True,'capability_ok':True,'depth':1,'state_ok':True,'stage_ok':True,'payload_ok':True,'amount':1001,'spent':0,'budget':2000,'approval_ok':True,'approver':'finance','human_ok':False}
        self.assertEqual(self.engine.simulate(facts)['decision'],'deny');self.assertEqual(self.read_task(),before)
    def test_no_legacy_tool_bypass(self):
        text=(ROOT/'packages/simulator/src/simulate.ts').read_text()
        self.assertNotIn('orders.push',text);self.assertNotIn('next.authorization',text)
        self.deny(self.call(self.body('purchase',action='raw_purchase')))
    def test_traceability_unverified_and_signed_review(self):
        report=analyze(json.loads((ROOT/'examples/procurement.json').read_text()),json.loads((ROOT/'examples/scenarios.json').read_text()))
        trace=propose(report);self.assertEqual(len(trace['requirements']),16)
        selected=trace['requirements'][0]
        with self.assertRaises(ValueError):approve_requirement(trace,report,selected['id'],'fixture-human','Test',self.admin_key,True)
        hid=selected['hazard_id']
        for action in ['accept','assess','approve_requirement']:
            report=review(report,hid,action,'fixture-human','SYNTHETIC TEST ONLY',True,3,2,'acceptable')
        trace=propose(report);trace['requirements']=[r for r in trace['requirements'] if r['hazard_id']==hid]
        approved=approve_requirement(trace,report,trace['requirements'][0]['id'],'fixture-human','SYNTHETIC TEST ONLY',self.admin_key,True)
        check_trace(approved,self.admin_key.public_key())
        approved['requirements'][0]['text']='Changed requirement'
        with self.assertRaises(InvalidSignature):check_trace(approved,self.admin_key.public_key())

if __name__=='__main__':unittest.main()
