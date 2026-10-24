import json
import tempfile
import unittest
from pathlib import Path
from aps_governance.acceptance import assess
from aps_governance.dashboard import inspect, render as render_dashboard
from aps_governance.experiment import run
from aps_governance.report import render


class ReportTests(unittest.TestCase):
    def test_report_reconciles_trials_and_acceptance_rejects_edits(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            summary = run(17, 1, root)
            data = inspect(root)
            report = render(root)
            self.assertEqual(report, render(root))
            self.assertIn(summary['evidence_head']['hash'], report)
            self.assertIn(summary['workload_digest'], report)
            for trial in data['trials']:
                self.assertIn(f'dashboard/index.html#evidence-{trial["sequence"]}', report)
            for config, group in data['metrics']['configurations'].items():
                self.assertIn(f"| {config} | 10 | 10 | 0 |", report)
                self.assertIn(f"{group['unsafe_mutations']} / {group['attack_attempts']}", report)
            for gap in ('unmeasured', 'not_attested', 'proposed', 'missing', 'not atomic'):
                self.assertIn(gap, report)
            dashboard = root.parent/'dashboard'
            dashboard.mkdir()
            (dashboard/'data.json').write_text(json.dumps(data))
            (dashboard/'index.html').write_text(render_dashboard(data))
            report_path = root.parent/'report.md'
            def report_check():
                return next(c['passed'] for c in assess(root)['checks']
                            if c['name'] == 'technical_report.consistency')
            self.assertFalse(report_check())
            report_path.write_text(report)
            self.assertTrue(report_check())
            report_path.write_text(report.replace('| A | 10 | 10 | 0 |', '| A | 10 | 9 | 1 |'))
            self.assertFalse(report_check())
            self.assertFalse(assess(root)['passed'])

    def test_report_rejects_corrupted_source_artifact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)/'run'
            run(18, 1, root)
            (root/'workload.json').write_text('{}')
            with self.assertRaises(ValueError):
                render(root)
