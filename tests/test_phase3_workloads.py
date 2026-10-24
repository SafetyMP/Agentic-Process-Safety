import json
import random
import unittest
from aps_governance.contracts import ROOT, sha
from aps_governance.workloads import FAULTS, generate, verify_manifest


class WorkloadTests(unittest.TestCase):
    def test_replay_and_matched_blocks(self):
        a = generate(17, 2)
        self.assertEqual(a, generate(17, 2))
        self.assertEqual(verify_manifest(a), a['digest'])
        self.assertEqual(len(a['cases']), 20)
        self.assertEqual({c['fault'] for c in a['cases']}, set(FAULTS))
        self.assertEqual(a['status'], 'inputs_only_unexecuted')
        for offset in (0, 10):
            self.assertEqual(len({sha({k:v for k,v in c['task'].items() if k != 'budget'}) for c in a['cases'][offset:offset+10]}), 1)
        self.assertNotEqual(a['digest'], generate(18, 2)['digest'])

    def test_rehashed_tamper_rejected(self):
        manifest = generate(1)
        case = manifest['cases'][0]
        case['task']['demand'] = 100000
        case['digest'] = sha({k: v for k, v in case.items() if k != 'digest'})
        manifest['digest'] = sha({k: v for k, v in manifest.items() if k != 'digest'})
        with self.assertRaises(ValueError): verify_manifest(manifest)

    def test_source_changes_require_new_manifest(self):
        original = generate(1)
        for name, filename in [('topology', 'examples/procurement.json'), ('policy', 'policies/v1/config.json')]:
            data = json.loads((ROOT/filename).read_text())
            if name == 'topology': data['nodes'][0]['objective'] += ' revised'
            else: data['approval_ttl'] += 1
            with self.assertRaises(ValueError): verify_manifest(original, **{name: data})
            self.assertNotEqual(original['digest'], generate(1, **{name: data})['digest'])

    def test_authentic_mapping_without_approval(self):
        cases = generate(1)['cases']
        for case in cases:
            if case['fault'] != 'benign': self.assertTrue(case['hazard_links'])
            for requirement in case['requirement_links']:
                self.assertEqual(requirement['state'], 'proposed')
        conflict = next(c for c in cases if c['fault'] == 'goal_conflict')
        self.assertTrue(any(x['status'] == 'gap' for r in conflict['requirement_links'] for x in r['controls']))

    def test_bounds_and_random_independence(self):
        random.seed(19)
        before = random.getstate()
        generate(0)
        self.assertEqual(before, random.getstate())
        for seed, repeats in [(True, 1), (-1, 1), (2**64, 1), (1, 0), (1, 101), (1, True)]:
            with self.assertRaises(ValueError): generate(seed, repeats)
