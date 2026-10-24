"""Only real OPA executes policy; errors never fall back to Python authorization."""
import json
import shutil
import subprocess
from pathlib import Path
from dataclasses import dataclass
from .contracts import canonical, sha, validate

@dataclass(frozen=True, slots=True, init=False)
class PolicyEngine:
    bundle: Path
    executable: str
    timeout: float
    _rego: bytes
    _config: bytes
    _digest: str
    _version: str

    def __init__(self, bundle, executable=None, timeout=1.0):
        bundle = Path(bundle)
        rego = (bundle/'procurement.rego').read_bytes()
        config = validate('governance-policy', json.loads((bundle/'config.json').read_text()))
        if config['human_threshold'] > config['spend_cap']: raise ValueError('Threshold exceeds cap')
        # Immutable bytes/strings are the sole effective policy snapshot. Config
        # reads return independent objects, including nested allowlists.
        for name, value in {
            'bundle': bundle, 'executable': executable or shutil.which('opa') or 'opa',
            'timeout': timeout, '_rego': rego, '_config': canonical(config),
            '_digest': sha({'rego': rego.decode(), 'config': config}), '_version': config['version'],
        }.items():
            object.__setattr__(self, name, value)

    @property
    def rego(self): return self._rego

    @property
    def config(self): return json.loads(self._config)

    @property
    def digest(self): return self._digest

    @property
    def version(self): return self._version

    def evaluate(self, facts):
        validate('policy-input',facts)
        # Passing the frozen module through a private temporary file avoids policy-file TOCTOU.
        import tempfile
        with tempfile.TemporaryDirectory(prefix='aps-policy-') as d:
            module = Path(d)/'policy.rego'; module.write_bytes(self.rego)
            process = subprocess.run([self.executable, 'eval', '--format=json', '--strict-builtin-errors',
                                      '--timeout=500ms', '--stdin-input', '--data', str(module),
                                      'data.aps.procurement.decision'], input=canonical(facts),
                                     capture_output=True, timeout=self.timeout, check=True)
        raw = json.loads(process.stdout)
        results = raw.get('result', [])
        if len(results) != 1 or len(results[0]['expressions']) != 1: raise ValueError('Undefined or ambiguous policy result')
        return validate('policy-decision', results[0]['expressions'][0]['value'])

    def simulate(self, facts):
        # No activation and no tool execution; use the same evaluator as enforcement.
        return self.evaluate({**facts, 'config': self.config})
