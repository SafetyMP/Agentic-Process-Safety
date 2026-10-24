import copy
import tempfile
import unittest
from pathlib import Path
from aps_governance.experiment import run
from aps_governance.evidence import EvidenceLog
from aps_governance.observations import rejection_observations, summarize_observations, gateway_boundaries


class ObservationTests(unittest.TestCase):
    def test_aggregation_preserves_missingness_and_clock_scope(self):
        denied = {'request_id': 'denied', 'violations': ['scope'], 'decision': 'deny',
                  'executed': False, 'elapsed_ns': 30, 'before_state': {}, 'after_state': {},
                  'before_authority': {}, 'after_authority': {},
                  'safety_observation': {'schema_version': 'response-rejection-v1',
                      'clock': 'perf_counter_ns', 'request_id': 'denied', 'exposure_ns': 100,
                      'rejection_observed_ns': 110, 'containment_verified_ns': 120}}
        undetected = {'violations': ['scope'], 'decision': 'allow'}
        result = summarize_observations([denied, undetected, {'violations': []}])
        self.assertEqual(result['attack_call_denominator'], 2)
        self.assertEqual(result['detection_latency_ns'], {'observed_count': 1,
            'missing_count': 1, 'total_ns': 10, 'mean_ns': 10, 'min_ns': 10, 'max_ns': 10})
        self.assertEqual(result['containment_latency_ns']['mean_ns'], 20)
        denied['safety_observation']['containment_verified_ns'] = None
        self.assertIsNone(summarize_observations([denied])['containment_latency_ns']['mean_ns'])
        self.assertEqual(summarize_observations([])['detection_latency_ns']['observed_count'], 0)

    def test_real_denials_and_corrupt_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            run(17, 1, root)
            trials = [r['event']['payload'] for r in EvidenceLog(root/'evidence.sqlite').records()
                      if r['event']['kind'] == 'runtime_trial']
            calls = [c for t in trials for c in t['calls']]
            observations = rejection_observations(calls)
            self.assertGreater(len(observations), 0)
            self.assertTrue(all(o['containment_latency_ns'] >= o['detection_latency_ns'] >= 0
                                for o in observations))
            internal = [sample for t in trials
                        for sample in gateway_boundaries(t['calls'], t.get('receipts', []))]
            self.assertGreater(len(internal), 0)
            self.assertTrue(all(s['containment_latency_ns'] >= s['detection_latency_ns'] >= 0
                                for s in internal))
            governed = next(t for t in trials if any(c.get('gateway_observation')
                                                    and c.get('safety_observation') for c in t['calls']))
            selected_internal = next(c for c in governed['calls'] if c.get('gateway_observation')
                                     and c.get('safety_observation'))
            for field, value in [('request_id', 'unrelated'), ('request_hash', 'wrong'),
                                 ('receipt_hash', 'unknown'), ('decision_ns', -1),
                                 ('entered_ns', True),
                                 ('decision_ns', selected_internal['gateway_observation']['transaction_exited_ns']+1),
                                 ('entered_ns', selected_internal['safety_observation']['exposure_ns']-1),
                                 ('transaction_exited_ns', 2**63), ('clock', 'wall')]:
                altered = copy.deepcopy(selected_internal)
                altered['gateway_observation'][field] = value
                with self.assertRaises(ValueError):
                    gateway_boundaries([altered], governed['receipts'])
            # Absence is explicit missingness; a clock without its receipt is corruption.
            altered = copy.deepcopy(selected_internal)
            del altered['gateway_observation']
            self.assertEqual(gateway_boundaries([altered], governed['receipts']), [])
            with self.assertRaises(ValueError):
                gateway_boundaries([selected_internal], [])
            with self.assertRaises(ValueError):
                gateway_boundaries([selected_internal, selected_internal], governed['receipts'])
            selected = next(c for c in calls if c.get('safety_observation'))
            for field, value in [('request_id', 'unrelated'), ('exposure_ns', -1),
                                 ('containment_verified_ns', 0), ('clock', 'wall')]:
                altered = copy.deepcopy(selected)
                altered['safety_observation'][field] = value
                with self.assertRaises(ValueError): rejection_observations([altered])
            altered = copy.deepcopy(selected)
            altered['after_state']['version'] += 1
            with self.assertRaises(ValueError): rejection_observations([altered])
            altered = copy.deepcopy(selected)
            altered['decision'] = 'allow'
            with self.assertRaises(ValueError): rejection_observations([altered])

    def test_commit_failure_returns_no_observation_or_receipt(self):
        from contextlib import contextmanager
        from unittest.mock import patch
        from test_governance import GovernanceTests
        fixture = GovernanceTests()
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        transaction = fixture.store.transaction

        @contextmanager
        def failing_commit():
            with transaction() as db:
                yield db
                raise RuntimeError('injected failure before commit')

        body = fixture.body('demand')
        with patch.object(fixture.store, 'transaction', failing_commit):
            with self.assertRaisesRegex(RuntimeError, 'before commit'):
                fixture.g.call_observed(fixture.c['tokens']['demand'], body)
        with transaction() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM receipts').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM nonces').fetchone()[0], 0)


if __name__ == '__main__': unittest.main()
