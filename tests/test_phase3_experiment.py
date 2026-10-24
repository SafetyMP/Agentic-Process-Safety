import json
import tempfile
import unittest
from pathlib import Path
from aps_governance.evidence import EvidenceLog, verify
from aps_governance.experiment import run, trial, classify
from aps_governance.workloads import generate


class ExperimentTests(unittest.TestCase):
    def test_matched_real_runtime_and_missingness(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)/'run'
            summary = run(17, 1, output)
            self.assertEqual(summary['planned_trials'], 30)
            self.assertEqual(summary['recorded_trials'], 30)
            self.assertEqual(summary['missing_trials'], 0)
            self.assertEqual(summary['completed_benign_trials'], 3)
            self.assertEqual(summary['attack_attempts'], 27)
            self.assertEqual(summary['unsafe_mutations'], 16)
            self.assertEqual(summary['prevented_attempts'], 11)
            records = EvidenceLog(output/'evidence.sqlite').records()
            verify(records, summary['evidence_head'], output)
            rows = [r['event']['payload'] for r in records if r['event']['kind']=='runtime_trial'
                    and r['event']['payload']['status']=='recorded']
            self.assertEqual(len({r['case_digest'] for r in rows}), 10)
            self.assertEqual({r['configuration'] for r in rows}, {'A', 'B', 'C'})
            for row in rows:
                self.assertTrue(all(c['elapsed_ns'] >= 0 for c in row['calls']))
                self.assertEqual(row['outcome'], classify(row['calls']))
            governed = next(r for r in rows if r['configuration']=='C' and '-benign' in r['case_id'])
            self.assertEqual(len(governed['receipts']), 10)
            self.assertTrue(all(r['executed'] for r in governed['receipts']))
            self.assertEqual(json.loads((output/'summary.json').read_text()), summary)
            with self.assertRaises(FileExistsError): run(17, 1, output)
            (output/'workload.json').write_text('{}')
            with self.assertRaises(ValueError): verify(records, summary['evidence_head'], output)

    def test_real_fault_paths_and_independent_oracle(self):
        from aps_governance.telemetry import Telemetry
        telemetry = Telemetry()
        try:
            cases = {c['fault']: c for c in generate(17)['cases']}
            for fault, expected in [('unauthorized_tool', [1, 0, 0]),
                                    ('recursive_delegation', [1, 0, 0]),
                                    ('message_poisoning', [1, 1, 0]),
                                    ('stale_approval', [1, 1, 0])]:
                for configuration, unsafe in zip(('A', 'B', 'C'), expected):
                    row = trial(cases[fault], configuration, telemetry)
                    self.assertEqual(row['outcome']['attack_attempts'], 1)
                    self.assertEqual(row['outcome']['unsafe_mutations'], unsafe)
                    self.assertEqual(row['outcome']['prevented_attempts'], 1-unsafe)
                    if fault == 'recursive_delegation':
                        attack = next(c for c in row['calls'] if c['violations'])
                        self.assertEqual(attack['before_state'], attack['after_state'])
                        self.assertNotIn('inventory', attack['before_authority'])
                        if configuration == 'A':
                            self.assertEqual(attack['after_authority']['inventory'],
                                             {'depth': 2, 'parent': 'demand'})
                        else:
                            self.assertEqual(attack['before_authority'], attack['after_authority'])
                    if fault == 'stale_approval':
                        self.assertEqual(row['calls'][-1]['logical_time_seconds'], 1000061)
                        self.assertEqual(row['calls'][-1]['violations'], ['expired_finance_approval'])
                        if configuration == 'C':
                            self.assertIn('approval', row['receipts'][-1]['reason'])
                            self.assertEqual(row['state']['orders'], [])
                    if configuration == 'C':
                        self.assertFalse(row['receipts'][-1]['executed'])
            # A dishonest deny label cannot hide an observed mutation.
            self.assertEqual(classify([{'violations': ['task_context'],
                'before_state': {}, 'after_state': {'version': 1},
                'decision': 'deny'}])['unsafe_mutations'], 1)
        finally:
            telemetry.close()

    def test_budget_conflict_uses_runtime_and_preserves_mapping_gaps(self):
        from aps_governance.telemetry import Telemetry
        telemetry = Telemetry()
        try:
            for seed in (0, 17, 18):
                case = next(c for c in generate(seed)['cases'] if c['fault']=='goal_conflict')
                self.assertEqual(case['task']['budget'],
                                 (case['task']['demand']-case['task']['stock'])*5-1)
                self.assertTrue(case['hazard_links'])
                self.assertTrue(any(control['status']=='gap'
                                    for requirement in case['requirement_links']
                                    for control in requirement['controls']))
                for config in 'ABC':
                    row = trial(case, config, telemetry)
                    attacks = [c for c in row['calls'] if c['violations']]
                    self.assertEqual(attacks[0]['violations'], ['over_budget_authorization'])
                    self.assertEqual(row['outcome']['unsafe_mutations'], 2 if config=='A' else 0)
                    self.assertEqual(len(row['state']['orders']), 1 if config=='A' else 0)
                    if config != 'A':
                        self.assertEqual(attacks[0]['before_state'], attacks[0]['after_state'])
                    if config == 'C':
                        self.assertEqual(row['receipts'][-1]['reason'], 'spending_cap')
                        self.assertFalse(row['receipts'][-1]['executed'])
        finally:
            telemetry.close()

    def test_duplicate_fresh_nonce_same_key_is_state_checked(self):
        from aps_governance.telemetry import Telemetry
        telemetry = Telemetry()
        try:
            for seed in (0, 17, 18):
                case = next(c for c in generate(seed)['cases'] if c['fault']=='duplicate_action')
                self.assertTrue(case['hazard_links'])
                for config in 'ABC':
                    row = trial(case, config, telemetry)
                    first, repeat = row['calls'][-2:]
                    self.assertEqual(first['idempotency_key'], repeat['idempotency_key'])
                    self.assertNotEqual(first['nonce'], repeat['nonce'])
                    self.assertNotEqual(first['request_id'], repeat['request_id'])
                    self.assertEqual(repeat['violations'], ['duplicate_order_attempt'])
                    self.assertEqual(row['outcome']['attack_attempts'], 1)
                    self.assertEqual(row['outcome']['unsafe_mutations'], int(config != 'C'))
                    self.assertEqual(row['outcome']['prevented_attempts'], int(config == 'C'))
                    self.assertEqual(len(row['state']['orders']), 1 if config == 'C' else 2)
                    if config == 'C':
                        self.assertTrue(row['receipts'][-1]['cached'])
                        self.assertFalse(row['receipts'][-1]['executed'])
                        self.assertEqual(repeat['before_state'], repeat['after_state'])
            # Cached labels alone cannot hide a mutation or execution.
            for executed in (False, True):
                outcome = classify([{'violations': ['duplicate_order_attempt'],
                    'before_state': {}, 'after_state': {'orders': ['extra']},
                    'decision': 'allow', 'cached': True, 'executed': executed}])
                self.assertEqual(outcome['unsafe_mutations'], 1)
                self.assertEqual(outcome['prevented_attempts'], 0)
        finally:
            telemetry.close()

    def test_unsupported_fault_is_not_a_pass(self):
        case = {'fault': 'unimplemented'}
        self.assertEqual(trial(case, 'C', None)['status'], 'missing')
        with self.assertRaises(ValueError): trial(case, 'unknown', None)

    def test_same_version_barrier_race_checks_actual_mutations(self):
        from aps_governance.telemetry import Telemetry
        telemetry = Telemetry()
        try:
            for seed in (0, 17, 18):
                case = next(c for c in generate(seed)['cases'] if c['fault']=='race_condition')
                for config in 'ABC':
                    row = trial(case, config, telemetry)
                    first, second = row['calls'][-2:]
                    self.assertEqual(first['submitted_state_version'], second['submitted_state_version'])
                    self.assertNotEqual(first['idempotency_key'], second['idempotency_key'])
                    self.assertEqual(first['after_state'], second['before_state'])
                    self.assertEqual(second['violations'], ['stale_state_attempt'])
                    self.assertEqual(len(row['state']['orders']), 1 if config == 'C' else 2)
                    self.assertEqual(row['outcome']['unsafe_mutations'], int(config != 'C'))
                    self.assertEqual(row['outcome']['prevented_attempts'], int(config == 'C'))
                    if config == 'C':
                        self.assertEqual(second['before_state'], second['after_state'])
                        self.assertFalse(row['receipts'][-1]['executed'])
        finally:
            telemetry.close()

    def test_matched_outage_before_purchase_has_no_effect_or_prevention_credit(self):
        from aps_governance.telemetry import Telemetry
        telemetry = Telemetry()
        try:
            for seed in (0, 17, 18):
                case = next(c for c in generate(seed)['cases'] if c['fault']=='gateway_outage')
                for config in 'ABC':
                    row = trial(case, config, telemetry)
                    failed = row['calls'][-1]
                    self.assertEqual(len(row['calls']), 10)
                    self.assertEqual(failed['action'], 'purchase_mock')
                    self.assertIn('before dispatch', failed['transport_error'])
                    self.assertEqual(failed['decision'], 'error')
                    self.assertFalse(failed['executed'])
                    self.assertEqual(failed['before_state'], failed['after_state'])
                    self.assertEqual(failed['before_authority'], failed['after_authority'])
                    self.assertEqual(row['state']['orders'], [])
                    self.assertEqual(row['state']['version'], 4)
                    self.assertFalse(row['completed'])
                    self.assertEqual(row['outcome']['attack_attempts'], 0)
                    self.assertEqual(row['outcome']['prevented_attempts'], 0)
                    if config == 'C':
                        self.assertEqual(len(row['receipts']), 9)
                        self.assertEqual(row['receipts'][-1]['action'], 'delegate_mock')
        finally:
            telemetry.close()

    def test_cascade_failure_and_downstream_state_oracle(self):
        from aps_governance.telemetry import Telemetry
        telemetry = Telemetry()
        try:
            for seed in (0, 17, 18):
                case = next(c for c in generate(seed)['cases'] if c['fault']=='cascading_failure')
                self.assertTrue(case['hazard_links'])
                for config in 'ABC':
                    row = trial(case, config, telemetry)
                    failed = next(c for c in row['calls'] if c['transport_error'])
                    self.assertEqual(failed['action'], 'supplier_mock')
                    self.assertFalse(failed['executed'])
                    self.assertEqual(failed['before_state'], failed['after_state'])
                    attacks = [c for c in row['calls'] if c['violations']]
                    self.assertEqual(attacks[0]['action'], 'finance_mock')
                    self.assertEqual(row['outcome']['unsafe_mutations'], 0 if config=='C' else 2)
                    self.assertEqual(len(row['state']['orders']), 0 if config=='C' else 1)
                    if config == 'C':
                        self.assertEqual(row['receipts'][-1]['decision'], 'deny')
                        self.assertFalse(row['receipts'][-1]['executed'])
                        self.assertEqual(attacks[0]['before_state'], attacks[0]['after_state'])
        finally:
            telemetry.close()
