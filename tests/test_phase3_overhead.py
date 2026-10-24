import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from aps_governance.experiment import run
from aps_governance.metrics import measure
from aps_governance.overhead import validate_pairs
from aps_governance.evidence import EvidenceLog, ZERO
from aps_governance.contracts import sha
from aps_governance.telemetry import verify_export


class OverheadTests(unittest.TestCase):
    def test_raw_pairs_recomputation_and_rehashed_corruption(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            summary = run(29, 1, root)
            original = EvidenceLog(root/'evidence.sqlite').records()
            metrics = measure(root)
            pairs = metrics['paired_overhead']['pairs']
            self.assertEqual({p['order'] for p in pairs}, {'control-first', 'governed-first'})
            self.assertEqual(len(pairs), 4)
            self.assertEqual(metrics['causal_governance_overhead_ns'],
                             sum(p['governed_elapsed_ns']-p['control_elapsed_ns'] for p in pairs)/4)
            records = {r['sequence']: r for r in original}
            for p in pairs:
                self.assertEqual(records[p['evidence_sequence']]['event']['payload'],
                                 {k: v for k, v in p.items() if k != 'evidence_sequence'})
            trials = [t for p in pairs for t in (p['control_trial'], p['governed_trial'])]
            trials += pairs[0]['warmup_trials']
            if metrics['telemetry']['sdk_available']:
                self.assertEqual(verify_export(root/'overhead-spans.jsonl', trials)['matched_receipts'], 100)
            for mutation in ('sum', 'bool', 'order', 'input', 'state', 'receipt', 'clock',
                             'request', 'missing_call', 'missing_pair', 'duplicate_pair', 'source', 'method'):
                changed = copy.deepcopy(original)
                pairs_records = [r for r in changed if r['event']['kind'] == 'overhead_pair']
                p = pairs_records[0]['event']['payload']
                call = p['control_trial']['calls'][0]
                if mutation == 'sum': p['control_elapsed_ns'] += 1
                elif mutation == 'bool': p['control_elapsed_ns'] = True
                elif mutation == 'order': p['order'] = 'governed-first'
                elif mutation == 'input': p['control_input_digest'] = 'fake'
                elif mutation == 'state': p['control_final_state']['stock'] += 1
                elif mutation == 'receipt': p['control_trial']['receipts'][0]['signature'] = 'forged'
                elif mutation == 'clock': call['dispatch_started_ns'] = call['dispatch_ended_ns']+1
                elif mutation == 'request': call['submitted_request']['payload']['value'] += 1
                elif mutation == 'missing_call': p['control_trial']['calls'].pop()
                elif mutation == 'missing_pair': changed.remove(pairs_records[-1])
                elif mutation == 'duplicate_pair': changed.append(copy.deepcopy(pairs_records[0]))
                elif mutation == 'source': p['setup']['source_digest'] = 'fake'
                else: p['setup']['method']['toggle'] = 'different runtime'
                previous = ZERO
                for index, record in enumerate(changed, 1):
                    record['sequence'] = index
                    record['previous_hash'] = previous
                    record['hash'] = sha({k: v for k, v in record.items() if k != 'hash'})
                    previous = record['hash']
                altered = dict(summary, evidence_head={'count': len(changed), 'hash': previous})
                (root/'summary.json').write_text(json.dumps(altered))
                with self.subTest(mutation=mutation), patch.object(EvidenceLog, 'records', return_value=changed):
                    with self.assertRaises(Exception): measure(root)
            (root/'summary.json').write_text(json.dumps(summary))
            self.assertEqual(validate_pairs([], summary['workload_digest'])['pairs'], [])
            if metrics['telemetry']['sdk_available']:
                with self.assertRaises(ValueError):
                    verify_export(root/'overhead-spans.jsonl', trials[:-1])
