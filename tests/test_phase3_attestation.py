import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from aps_governance.attestation import execute, validate, attach, inspect, COMMANDS
from aps_governance.regression import snapshot
from aps_governance.experiment import run


class AttestationTests(unittest.TestCase):
    def test_actual_execution_and_provenance_tampering(self):
        import json
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            # Run a real subprocess while keeping this unit test finite.
            with patch.dict(COMMANDS, {'typecheck': ['.venv/bin/python', '-c', 'print("executed")']}):
                self.assertEqual(execute('typecheck', output), 0)
                row = json.loads((output/'typecheck.execution.json').read_text())
                log = (output/'typecheck.log').read_bytes()
                current = snapshot(Path.cwd())
                self.assertTrue(validate(row, log, current))
                for key, value in [('command', ['fake']), ('end_ns', 0),
                                   ('inputs_after', {}), ('log_sha256', 'fake')]:
                    altered = copy.deepcopy(row)
                    altered[key] = value
                    with self.subTest(key=key), self.assertRaises(ValueError):
                        validate(altered, log, current)
                row['exit_code'] = 1
                self.assertFalse(validate(row, log, current))
                with self.assertRaises(ValueError):
                    validate(row, log+b'changed', current)

    def test_ledger_binding_failed_tests_and_artifact_tampering(self):
        import json
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            root = output/'run'
            run(17, 1, root)
            self.assertEqual(inspect(root)['status'], 'not_attested')
            commands = {label: ['.venv/bin/python', '-c', 'raise SystemExit(1)']
                        for label in COMMANDS}
            with patch.dict(COMMANDS, commands):
                for label in COMMANDS:
                    self.assertEqual(execute(label, output), 1)
                attach(root)
                result = inspect(root)
                self.assertEqual(result['status'], 'failed')
                self.assertEqual(len(result['executions']), 4)
                path = root/'test-executions/typecheck.execution.json'
                row = json.loads(path.read_text())
                row['exit_code'] = 0
                path.write_text(json.dumps(row))
                with self.assertRaisesRegex(ValueError, 'Artifact digest'):
                    inspect(root)
