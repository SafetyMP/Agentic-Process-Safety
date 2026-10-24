import copy
import json
import tempfile
import unittest
from pathlib import Path
from aps_governance.dashboard import inspect, render
from aps_governance.evidence import EvidenceLog, verify
from aps_governance.experiment import run


class DashboardTests(unittest.TestCase):
    def test_consistency_and_safe_rendering(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            summary = run(17, 1, root)
            data = inspect(root)
            self.assertEqual(len(data['trials']), summary['planned_trials'])
            self.assertEqual(len(data['incidents']), 13)
            self.assertEqual(sum(t.get('outcome', {}).get('unsafe_mutations', 0)
                                 for t in data['trials']), 16)
            self.assertTrue(data['risk_review_queue'])
            self.assertTrue(all(r['state'] == 'proposed' for r in data['requirements']))
            self.assertEqual(data['tests']['status'], 'not_attested')
            self.assertEqual(sum(t['status'] == 'missing' for t in data['trials']), 0)
            altered = copy.deepcopy(data)
            altered['trials'][0]['reason'] = '<script>alert(1)</script>'
            page = render(altered)
            self.assertNotIn('<script>', page)
            self.assertIn('&lt;script&gt;', page)
            for trial in data['trials']:
                self.assertIn(f'id="evidence-{trial["sequence"]}"', page)
            summary['workload_digest'] = 'wrong'
            (root/'summary.json').write_text(json.dumps(summary))
            with self.assertRaisesRegex(ValueError, 'workload mismatch'):
                inspect(root)

    def test_valid_chain_cannot_hide_duplicate_trial(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            summary = run(18, 1, root)
            records = EvidenceLog(root/'evidence.sqlite').records()
            # Construct a valid replacement chain with duplicate identity and pinned head.
            replacement = EvidenceLog(root/'replacement.sqlite')
            for record in records:
                event = copy.deepcopy(record['event'])
                if record['sequence'] == 2:
                    event = copy.deepcopy(records[0]['event'])
                replacement.append(event['run_id'], event['kind'], event['payload'], event['links'])
            (root/'replacement.sqlite').replace(root/'evidence.sqlite')
            summary['evidence_head'] = verify(EvidenceLog(root/'evidence.sqlite').records())
            (root/'summary.json').write_text(json.dumps(summary))
            with self.assertRaisesRegex(ValueError, 'Duplicate'):
                inspect(root)
