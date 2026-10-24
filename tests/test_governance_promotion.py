import copy
import json
import tempfile
import unittest
from pathlib import Path
from aps.core import analyze, review
from aps_governance.admin import Administration
from aps_governance.cli import simulate_cases
from aps_governance.contracts import ROOT, sha
from aps_governance.demo import request
from aps_governance.gateway import Gateway
from aps_governance.policy import PolicyEngine
from aps_governance.signing import new_key
from aps_governance.store import Store
from aps_governance.traceability import propose, approve_requirement, revise_requirement

class PromotionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.store=Store(Path(self.tmp.name)/'db');self.store.initialize();self.key=new_key();self.admin=Administration(self.store,self.key)
        self.engine=PolicyEngine(ROOT/'policies/v1');self.cases=json.loads((ROOT/'policies/v1/cases.json').read_text())
        self.report=analyze(json.loads((ROOT/'examples/procurement.json').read_text()),json.loads((ROOT/'examples/scenarios.json').read_text()))
    def test_nonreference_reviewed_hazard_always_linked(self):
        h=next(h for h in self.report['hazards'] if h['provenance']['scenario_id'].startswith('RULE-'))
        for a in ['accept','assess','approve_requirement']:self.report=review(self.report,h['id'],a,'fixture-human','Synthetic fixture',True,3,2,'acceptable')
        trace=propose(self.report)
        self.assertTrue(any(r['hazard_id']==h['id'] for r in trace['requirements']))
    def test_requirement_version_and_invalidated_approval(self):
        trace=propose(self.report);rid=trace['requirements'][0]['id'];old=copy.deepcopy(trace['requirements'][0])
        changed=revise_requirement(trace,rid,'New control wording')
        r=changed['requirements'][0]
        self.assertEqual(r['version'],2);self.assertEqual(r['previous_digest'],sha(old));self.assertEqual(r['state'],'proposed');self.assertIsNone(r['review_signature'])
        self.assertEqual(trace['requirements'][0],old)
    def test_candidate_must_be_reviewed_and_simulated(self):
        trace=propose(self.report)
        with self.assertRaises(ValueError):self.admin.activate(self.engine,trace,'fixture-human','Synthetic',True,simulation=simulate_cases(self.engine,self.cases))
        h=self.report['hazards'][0]
        for a in ['accept','assess','approve_requirement']:self.report=review(self.report,h['id'],a,'fixture-human','SYNTHETIC TEST ONLY',True,3,2,'acceptable')
        trace=propose(self.report);trace['requirements']=[r for r in trace['requirements'] if r['hazard_id']==h['id']]
        trace=approve_requirement(trace,self.report,trace['requirements'][0]['id'],'fixture-human','SYNTHETIC TEST ONLY',self.key,True)
        with self.assertRaises(Exception):self.admin.activate(self.engine,trace,'fixture-human','Synthetic',True)
        simulation=simulate_cases(self.engine,self.cases)
        self.admin.activate(self.engine,trace,'fixture-human','SYNTHETIC TEST ONLY',True,simulation=simulation)
        with self.assertRaises(ValueError):self.admin.activate(self.engine,trace,'fixture-human','Reuse version',True,simulation=simulation)
    def test_policy_activation_stops_old_worker(self):
        empty={'schema_version':'2.0','report_digest':sha({}),'requirements':[]}
        self.admin.activate(self.engine,empty,'bootstrap','Synthetic',baseline=True)
        c=self.admin.provision('task');g=Gateway(self.store,self.engine,new_key())
        bundle=Path(self.tmp.name)/'v2';bundle.mkdir()
        (bundle/'procurement.rego').write_bytes(self.engine.rego)
        config=copy.deepcopy(self.engine.config);config['version']='procurement-v2'
        (bundle/'config.json').write_text(json.dumps(config));candidate=PolicyEngine(bundle)
        self.admin.activate(candidate,empty,'fixture-human','SYNTHETIC TEST ONLY',True,simulation=simulate_cases(candidate,self.cases))
        b=request('orchestrator','task',c['context_id'],'delegate_mock',depth=0,target='demand')
        self.assertEqual(g.call(c['tokens']['orchestrator'],b)['receipt']['reason'],'policy_changed_or_unsigned')
        # Old signed bundle cannot be silently rolled back under a reused version.
        with self.assertRaises(ValueError):self.admin.activate(self.engine,empty,'fixture-human','Rollback',True,simulation=simulate_cases(self.engine,self.cases))
    def test_modified_policy_file_cannot_change_running_snapshot(self):
        bundle=Path(self.tmp.name)/'copy';bundle.mkdir()
        (bundle/'procurement.rego').write_bytes(self.engine.rego)
        (bundle/'config.json').write_text(json.dumps(self.engine.config))
        candidate=PolicyEngine(bundle)
        (bundle/'procurement.rego').write_text('package aps.procurement\nimport rego.v1\ndecision := {"decision":"allow","reason":"tampered"}')
        self.assertTrue(simulate_cases(candidate,self.cases)['passed'])
        modified=PolicyEngine(bundle);self.assertNotEqual(candidate.digest,modified.digest)
        self.assertFalse(simulate_cases(modified,self.cases)['passed'])

if __name__=='__main__':unittest.main()
