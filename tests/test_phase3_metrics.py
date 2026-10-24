import json
import tempfile
import unittest
import copy
from unittest.mock import patch
from pathlib import Path
from aps_governance.experiment import run
from aps_governance.metrics import measure
from aps_governance.evidence import EvidenceLog, ZERO
from aps_governance.contracts import sha


class MetricsTests(unittest.TestCase):
    def test_reconciles_evidence_and_rejects_tampering(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            summary = run(17, 1, root)
            result = measure(root)
            self.assertEqual(result['evidence_head'], summary['evidence_head'])
            groups = result['configurations']
            self.assertEqual(sum(g['unsafe_mutations'] for g in groups.values()), summary['unsafe_mutations'])
            for group in groups.values():
                self.assertEqual(group['planned_trials'], 10)
                self.assertEqual(group['recorded_trials'], 10)
                self.assertEqual(group['missing_trials'], 0)
                self.assertEqual(group['false_denial_denominator'], 1)
                self.assertEqual(group['false_denials'], 0)
                self.assertEqual(group['benign_completed'], 1)
            self.assertEqual([groups[c]['unsafe_mutations'] for c in 'ABC'], [10, 6, 0])
            self.assertEqual(groups['A']['gateway_boundary_samples'], [])
            self.assertEqual(groups['B']['gateway_boundary_samples'], [])
            self.assertGreater(len(groups['C']['gateway_boundary_samples']), 0)
            self.assertGreater(groups['C']['gateway_boundary_missing_attack_calls'], 0)
            self.assertTrue(all(s['evidence_sequence'] and s['receipt_hash']
                                for s in groups['C']['gateway_boundary_samples']))
            pairs = result['paired_overhead']['pairs']
            self.assertEqual(len(pairs), 4)
            self.assertEqual(result['causal_governance_overhead_ns'],
                             sum(p['governed_elapsed_ns']-p['control_elapsed_ns'] for p in pairs)/4)
            for field in ('detection_latency_ns', 'containment_latency_ns'):
                samples = [s[field] for g in groups.values()
                           for s in g['gateway_boundary_samples'] if s[field] is not None]
                self.assertGreaterEqual(len(samples), 3)
                self.assertEqual(result[field], sum(samples)/len(samples))
            for group in groups.values():
                self.assertEqual(group['gateway_boundary_missing_attack_calls'],
                                 group['attack_attempts']-len(group['gateway_boundary_samples']))
            original = EvidenceLog(root/'evidence.sqlite').records()
            for mutation in ('receipt_signature', 'clock'):
                records = copy.deepcopy(original)
                row = next(r['event']['payload'] for r in records
                           if r['event']['kind'] == 'runtime_trial' and r['event']['payload']['configuration'] == 'C'
                           and any(c.get('gateway_observation') and c.get('safety_observation')
                                   for c in r['event']['payload']['calls']))
                if mutation == 'receipt_signature':
                    row['receipts'][0]['signature'] = 'invalid'
                else:
                    call = next(c for c in row['calls'] if c.get('gateway_observation')
                                and c.get('safety_observation'))
                    call['gateway_observation']['decision_ns'] = -1
                previous = ZERO
                for record in records:
                    record['previous_hash'] = previous
                    record['hash'] = sha({k: v for k, v in record.items() if k != 'hash'})
                    previous = record['hash']
                altered_summary = dict(summary, evidence_head={'count': len(records), 'hash': previous})
                (root/'summary.json').write_text(json.dumps(altered_summary))
                with self.subTest(mutation=mutation), patch.object(EvidenceLog, 'records', return_value=records):
                    with self.assertRaises(Exception): measure(root)
            (root/'summary.json').write_text(json.dumps(summary))
            (root/'workload.json').write_text('{}')
            with self.assertRaises(ValueError): measure(root)

    def test_pinned_head_rejects_summary_mismatch(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            summary = run(18, 1, root)
            summary['evidence_head']['count'] -= 1
            (root/'summary.json').write_text(json.dumps(summary))
            with self.assertRaises(ValueError): measure(root)
