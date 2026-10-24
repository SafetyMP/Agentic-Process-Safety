"""On-demand content-triggered regression; no background processes or remote actions."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

TREES = ('packages', 'policies', 'examples', 'schemas', 'tests', 'scripts')
MANIFESTS = ('pyproject.toml', 'requirements.lock', 'package.json',
             'package-lock.json', 'tsconfig.json')
COMMAND = ['bash', 'scripts/verify-phase3.sh']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def snapshot(root):
    root = Path(root)
    paths = [p for tree in TREES for p in (root/tree).rglob('*')
             if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc']
    paths += [root/name for name in MANIFESTS if (root/name).is_file()]
    files = {p.relative_to(root).as_posix(): digest(p.read_bytes()) for p in sorted(paths)}
    return {'files': files, 'digest': digest(json.dumps(files, sort_keys=True).encode())}


def check(root, output, *, force=False, runner=subprocess.run):
    root, output = Path(root).resolve(), Path(output).resolve()
    # Reports cannot live within watched inputs (that would invalidate themselves).
    if any(output == root/t or root/t in output.parents for t in TREES):
        raise ValueError('Regression output must be outside watched source trees')
    output.mkdir(parents=True, exist_ok=True)
    report_path, log_path = output/'regression.json', output/'verification.log'
    before = snapshot(root)
    try:
        prior = json.loads(report_path.read_text())
        reusable = (prior['schema_version'] == 'phase3-regression-1'
                    and prior['command'] == COMMAND and prior['passed'] is True
                    and prior['exit_code'] == 0 and prior['inputs'] == before
                    and prior['log_sha256'] == digest(log_path.read_bytes()))
    except (OSError, ValueError, KeyError, TypeError):
        reusable = False
    if reusable and not force:
        return {**prior, 'reused': True}
    with log_path.open('wb') as log:
        result = runner(COMMAND, cwd=root, stdout=log, stderr=subprocess.STDOUT,
                        check=False)
    after = snapshot(root)
    report = {'schema_version': 'phase3-regression-1', 'command': COMMAND,
              'inputs': before, 'inputs_after': after,
              'exit_code': result.returncode,
              'passed': result.returncode == 0 and before == after,
              'log_sha256': digest(log_path.read_bytes()), 'reused': False,
              'limitations': ['Local filesystem owner can replace cache and source.',
                              'On-demand only; does not monitor changes between invocations.',
                              'Passing checks cover their implemented acceptance scope only.']}
    report_path.write_text(json.dumps(report, indent=2)+'\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    report = check(args.root, args.out, force=args.force)
    print(json.dumps({k: report[k] for k in ('passed', 'reused', 'exit_code')}))
    raise SystemExit(0 if report['passed'] else 1)


if __name__ == '__main__':
    main()
