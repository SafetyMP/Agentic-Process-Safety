import json
import tempfile
import unittest
from pathlib import Path
from aps_governance.acceptance import assess
from aps_governance.dashboard import inspect, render
from aps_governance.experiment import run


class AcceptanceTests(unittest.TestCase):
    def test_race_participants_and_observations_are_rechecked(self):
        import copy
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            run(17, 1, root)
            original = inspect(root)
            for config in 'ABC':
                for mutation in ('version', 'nonce', 'violation', 'state'):
                    data = copy.deepcopy(original)
                    row = next(t for t in data['trials']
                               if t['configuration'] == config and t['fault'] == 'race_condition')
                    first, second = row['calls'][-2:]
                    if mutation == 'version': second['submitted_state_version'] += 1
                    elif mutation == 'nonce': second['nonce'] = first['nonce']
                    elif mutation == 'violation': second['violations'] = []
                    else: second['before_state']['version'] += 1
                    with self.subTest(config=config, mutation=mutation):
                        with patch('aps_governance.acceptance.inspect', return_value=data):
                            with self.assertRaisesRegex(ValueError, 'Invalid race'):
                                assess(root)

    def test_partial_run_and_summary_dashboard_tampering_fail(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            summary = run(17, 1, root)
            dashboard = root.parent/'dashboard'
            dashboard.mkdir()
            data = inspect(root)
            (dashboard/'data.json').write_text(json.dumps(data))
            (dashboard/'index.html').write_text(render(data))
            result = assess(root)
            checks = {c['name']: c for c in result['checks']}
            self.assertFalse(result['passed'])
            self.assertTrue(checks['signed_governed_receipts']['passed'])
            self.assertTrue(checks['dashboard.data']['passed'])
            self.assertTrue(checks['all_faults_executed']['passed'])
            self.assertEqual(len(checks['all_faults_executed']['detail']['missing_evidence_sequences']), 0)
            self.assertTrue(checks['measurement.detection_latency_ns']['passed'])
            self.assertTrue(checks['measurement.containment_latency_ns']['passed'])
            self.assertTrue(checks['measurement.causal_governance_overhead_ns']['passed'])
            import copy
            from unittest.mock import patch
            for mutation in ('mean', 'raw_pair', 'missing_pair'):
                altered = copy.deepcopy(data)
                if mutation == 'mean': altered['metrics']['causal_governance_overhead_ns'] += 1
                elif mutation == 'raw_pair':
                    altered['metrics']['paired_overhead']['pairs'][0]['governed_elapsed_ns'] += 1
                else: altered['metrics']['paired_overhead']['pairs'].pop()
                with self.subTest(overhead=mutation), patch('aps_governance.acceptance.inspect', return_value=altered):
                    altered_checks = {c['name']: c for c in assess(root)['checks']}
                    self.assertFalse(altered_checks['measurement.causal_governance_overhead_ns']['passed'])
            for mutation in ('aggregate', 'missingness', 'sample', 'missing_sample'):
                altered = copy.deepcopy(data)
                metrics = altered['metrics']
                if mutation == 'aggregate': metrics['detection_latency_ns'] += 1
                elif mutation == 'missingness':
                    metrics['configurations']['C']['gateway_boundary_missing_attack_calls'] = 0
                elif mutation == 'sample':
                    metrics['configurations']['C']['gateway_boundary_samples'][0]['receipt_hash'] = 'fake'
                else: metrics['configurations']['C']['gateway_boundary_samples'].pop()
                with self.subTest(mutation=mutation), patch('aps_governance.acceptance.inspect', return_value=altered):
                    altered_checks = {c['name']: c for c in assess(root)['checks']}
                    self.assertFalse(altered_checks['measurement.detection_latency_ns']['passed'])
            self.assertIn('otel_event_correspondence', checks)
            if not data['metrics']['telemetry']['sdk_available']:
                self.assertFalse(checks['otel_event_correspondence']['passed'])
            summary['unsafe_mutations'] = 0
            (root/'summary.json').write_text(json.dumps(summary))
            (dashboard/'index.html').write_text('fabricated dashboard')
            checks = {c['name']: c for c in assess(root)['checks']}
            self.assertFalse(checks['summary.unsafe_mutations']['passed'])
            self.assertFalse(checks['dashboard.html']['passed'])

    def test_receipt_signature_rechecked(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            run(18, 1, root)
            data = inspect(root)
            governed = next(t for t in data['trials'] if t['configuration'] == 'C' and t['status'] == 'recorded')
            governed['receipts'][0]['signature'] = 'invalid'
            with patch('aps_governance.acceptance.inspect', return_value=data):
                with self.assertRaises(Exception):
                    assess(root)

    def test_transport_gap_cannot_hide_executed_call(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            run(17, 1, root)
            data = inspect(root)
            cascade = next(t for t in data['trials']
                           if t['configuration']=='C' and t['fault']=='cascading_failure')
            failed = next(c for c in cascade['calls'] if c.get('transport_error'))
            failed['executed'] = True
            with patch('aps_governance.acceptance.inspect', return_value=data):
                with self.assertRaisesRegex(ValueError, 'Invalid pre-dispatch'):
                    assess(root)

    def test_outage_evidence_cannot_hide_mutation_or_claim_completion(self):
        import copy
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            run(17, 1, root)
            original = inspect(root)
            for config in 'ABC':
                for mutation in ('state', 'authority', 'execution', 'completion', 'absent_failure'):
                    data = copy.deepcopy(original)
                    row = next(t for t in data['trials']
                               if t['configuration']==config and t['fault']=='gateway_outage')
                    failed = row['calls'][-1]
                    if mutation == 'state': failed['after_state']['orders'].append('hidden')
                    elif mutation == 'authority': failed['after_authority']['intruder'] = {}
                    elif mutation == 'execution': failed['executed'] = True
                    elif mutation == 'completion': row['completed'] = True
                    else: failed['transport_error'] = None
                    with self.subTest(config=config, mutation=mutation):
                        with patch('aps_governance.acceptance.inspect', return_value=data):
                            with self.assertRaisesRegex(ValueError, 'Invalid'):
                                assess(root)
