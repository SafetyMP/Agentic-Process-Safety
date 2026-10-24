"""Offline integrity, fresh installation and authentic SDK export verification."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import venv

root = Path(__file__).resolve().parents[1]
wheelhouse = root / 'dependencies/otel-wheels'
manifest = json.loads((wheelhouse / 'manifest.json').read_text())
expected_lock = ''
assert len(manifest['packages']) == 6
for package in manifest['packages']:
    path = wheelhouse / package['filename']
    assert path.parent == wheelhouse and path.suffix == '.whl'
    assert package['url'].startswith('https://files.pythonhosted.org/')
    assert package['metadata_url'].startswith('https://pypi.org/pypi/')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == package['sha256'], path
    expected_lock += f"{package['name']}=={package['version']} --hash=sha256:{package['sha256']}\n"
assert (wheelhouse / 'requirements.lock').read_text() == expected_lock
assert {p.name for p in wheelhouse.glob('*.whl')} == {p['filename'] for p in manifest['packages']}
artifact_root = root / 'artifacts/phase3'
artifact_root.mkdir(parents=True, exist_ok=True)
directory = Path(tempfile.mkdtemp(prefix='wheelhouse-verification-', dir=artifact_root))
# Dispose of isolated installations on success and failure; retain audit evidence.
with tempfile.TemporaryDirectory(prefix='aps-otel-verification-', dir='/private/tmp') as temporary:
    environment = Path(temporary) / 'venv'
    venv.EnvBuilder(with_pip=True).create(environment)
    python = environment / 'bin/python'
    env = {**os.environ, 'PIP_CONFIG_FILE': os.devnull, 'PIP_DISABLE_PIP_VERSION_CHECK': '1',
           'PYTHONPATH': str(root / 'packages/governance')}
    with (directory / 'install.log').open('w') as log:
        subprocess.run([str(python), '-m', 'pip', 'install', '--no-index', '--no-cache-dir',
                        '--only-binary=:all:', '--find-links', str(wheelhouse), '--require-hashes',
                        '-r', str(wheelhouse / 'requirements.lock')], env=env, stdout=log,
                       stderr=subprocess.STDOUT, check=True)
    subprocess.run([str(python), '-m', 'pip', 'check'], env=env, check=True)
    probe = '''
    import importlib.metadata,json,sys
    from pathlib import Path
    from aps_governance.telemetry import Telemetry
    manifest=json.loads(Path(sys.argv[1]).read_text())
    for p in manifest['packages']:
        assert importlib.metadata.version(p['name'])==p['version']
    path=Path(sys.argv[2])
    t=Telemetry(path)
    assert t.status['sdk_available'] and t.status['export_configured'],t.status
    with t.span('orchestration',{'aps.verification':'offline-wheelhouse'}):
        with t.span('delegation') as child:
            child.add_event('delegation.observed',{'simulated':True})
    assert t.flush(),t.status
    t.close()
    raw=path.read_text().strip(); spans=[]; decoder=json.JSONDecoder()
    while raw:
        span,end=decoder.raw_decode(raw);spans.append(span);raw=raw[end:].lstrip()
    assert len(spans)==2
    parent=next(s for s in spans if s['name']=='orchestration')
    child=next(s for s in spans if s['name']=='delegation')
    assert child['parent_id']==parent['context']['span_id']
    assert child['context']['trace_id']==parent['context']['trace_id']
    assert child['events'][0]['name']=='delegation.observed'
    print(json.dumps({'packages':len(manifest['packages']),'exported_spans':len(spans),'status':t.status}))
    '''
    (directory / 'probe.py').write_text(textwrap.dedent(probe))
    with (directory / 'export-verification.json').open('w') as log:
        subprocess.run([str(python), str(directory / 'probe.py'), str(wheelhouse / 'manifest.json'),
                        str(directory / 'spans.json')], env=env, stdout=log, check=True)
print(f'Offline wheelhouse integrity/install/export verified: {directory.relative_to(root)}')
