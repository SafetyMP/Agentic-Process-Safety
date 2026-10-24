import copy, csv, json, tempfile, unittest
from pathlib import Path
from jsonschema import ValidationError, Draft202012Validator
from aps.core import ROOT, WORDS, analyze, validate, review, export_csv, deduplicate

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.top = json.loads((ROOT/'examples/procurement.json').read_text())
        self.scenarios = json.loads((ROOT/'examples/scenarios.json').read_text())
        self.report = analyze(self.top,self.scenarios)
        self.id = self.report['hazards'][0]['id']
    def test_schema_and_coverage(self):
        for path in (ROOT/'schemas').glob('*.json'): Draft202012Validator.check_schema(json.loads(path.read_text()))
        validate('report', self.report)
        self.assertEqual(len(self.report['hazards']),96)
        for node in self.top['nodes']:
            self.assertEqual({h['deviation'] for h in self.report['hazards'] if h['node']==node['id']},set(WORDS))
        for h in self.report['hazards']: validate('hazard',h)
    def test_stable_and_deduplicated(self):
        other=copy.deepcopy(self.top); other['nodes'].reverse()
        self.assertEqual([h['id'] for h in self.report['hazards']],[h['id'] for h in analyze(other,self.scenarios)['hazards']])
        self.assertEqual(self.report,analyze(self.top,self.scenarios))
    def test_interagent_path(self):
        self.assertTrue(any(c['path']==['demand','inventory','supplier','finance','purchase'] for c in self.report['cascades']))
    def test_cycles_terminate(self):
        self.top['communications'].append({'source':'purchase','target':'demand','data':'feedback','trust_boundary':'internal'})
        self.assertLess(len(analyze(self.top,self.scenarios)['cascades']),600)
    def test_invalid_graph(self):
        self.top['communications'][0]['target']='unknown'
        with self.assertRaises(ValueError): analyze(self.top,self.scenarios)
    def test_duplicate_nodes(self):
        self.top['nodes'].append(self.top['nodes'][0])
        with self.assertRaises(ValueError): analyze(self.top,self.scenarios)
    def test_unreviewed_cannot_approve(self):
        with self.assertRaises(ValueError): review(self.report,self.id,'approve_requirement','Human','checked',True)
        self.assertEqual(self.report['requirements'],[])
    def test_human_attestation_required(self):
        with self.assertRaises(ValueError): review(self.report,self.id,'accept','Human','checked')
    def test_review_happy_path(self):
        r=review(self.report,self.id,'accept','Reviewer','Confirmed applicability',True)
        r=review(r,self.id,'assess','Reviewer','Matrix judgment',True,4,2,'acceptable')
        r=review(r,self.id,'approve_requirement','Reviewer','Accept control requirement',True)
        self.assertEqual(r['requirements'],[self.id]); validate('report',r)
    def test_unacceptable_risk_blocks_requirement(self):
        r=review(self.report,self.id,'accept','Reviewer','checked',True)
        r=review(r,self.id,'assess','Reviewer','checked',True,5,5,'unacceptable')
        with self.assertRaises(ValueError): review(r,self.id,'approve_requirement','Reviewer','checked',True)
    def test_invalid_ratings(self):
        r=review(self.report,self.id,'accept','Reviewer','checked',True)
        with self.assertRaises(ValidationError): review(r,self.id,'assess','Reviewer','checked',True,6,2,'acceptable')
    def test_forged_state_rejected(self):
        self.report['hazards'][0]['review_state']='accepted'
        with self.assertRaises(ValueError): validate('report',self.report)
    def test_forged_requirements_rejected(self):
        self.report['requirements']=[self.id]
        with self.assertRaises(ValueError): validate('report',self.report)
    def test_csv_preserves_nested_fields(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'hazards.csv'; export_csv(self.report,p)
            with p.open() as f: rows=list(csv.DictReader(f))
            self.assertEqual(len(rows),96)
            self.assertEqual(json.loads(rows[0]['provenance']),self.report['hazards'][0]['provenance'])
    def test_reject_terminal(self):
        r=review(self.report,self.id,'reject','Human','Not applicable',True)
        with self.assertRaises(ValueError): review(r,self.id,'accept','Human','Changed mind',True)
    def test_assessment_tampering_rejected(self):
        r=review(self.report,self.id,"accept","Human","checked",True)
        r=review(r,self.id,"assess","Human","checked",True,5,5,"unacceptable")
        r["hazards"][0]["residual_risk"]="acceptable"
        with self.assertRaises(ValueError): validate("report",r)
    def test_dedup_conflicts(self):
        r=copy.deepcopy(self.report); r['hazards'].append(copy.deepcopy(r['hazards'][0]))
        self.assertEqual(deduplicate(r),self.report)
        r['hazards'][-1]['causes']=['conflicting evidence']
        with self.assertRaises(ValueError): deduplicate(r)
    def test_reference_scenarios(self):
        self.assertEqual(len(self.scenarios),16)
        self.assertEqual({s['deviation'] for s in self.scenarios},set(WORDS))
if __name__=='__main__': unittest.main()
