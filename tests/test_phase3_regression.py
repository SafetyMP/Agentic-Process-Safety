import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from aps_governance.regression import check


class ChangeRegressionTests(unittest.TestCase):
    def test_source_policy_topology_deletion_and_corrupt_log_trigger(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            calls = []
            def runner(command, **kwargs):
                calls.append(command)
                kwargs['stdout'].write(b'controlled test runner\n')
                return SimpleNamespace(returncode=0)
            out = root/'artifacts'
            for name in ('packages/agent.py', 'policies/config.json', 'examples/topology.json'):
                path = root/name
                path.parent.mkdir(exist_ok=True)
                path.write_text('initial')
            self.assertTrue(check(root, out, runner=runner)['passed'])
            self.assertTrue(check(root, out, runner=runner)['reused'])
            for name in ('packages/agent.py', 'policies/config.json', 'examples/topology.json'):
                (root/name).write_text('changed')
                self.assertFalse(check(root, out, runner=runner)['reused'])
            (root/'packages/agent.py').unlink()
            self.assertFalse(check(root, out, runner=runner)['reused'])
            (out/'verification.log').write_text('corrupt')
            self.assertFalse(check(root, out, runner=runner)['reused'])
            self.assertEqual(len(calls), 6)

    def test_failed_or_concurrently_changed_inputs_never_reused(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'packages').mkdir()
            source = root/'packages/agent.py'
            source.write_text('initial')
            out = root/'artifacts'
            def failed(*args, **kwargs):
                return SimpleNamespace(returncode=1)
            for _ in range(2):
                result = check(root, out, runner=failed)
                self.assertFalse(result['passed'])
                self.assertFalse(result['reused'])
            def changing(*args, **kwargs):
                source.write_text(source.read_text()+'changed')
                return SimpleNamespace(returncode=0)
            self.assertFalse(check(root, out, runner=changing)['passed'])
            with self.assertRaises(ValueError):
                check(root, root/'packages/output', runner=failed)
