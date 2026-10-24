"""Capture actual local test subprocess provenance, never independent approval."""
import argparse
import json
import subprocess
import shutil
import time
from pathlib import Path
from .regression import snapshot, digest
from .evidence import EvidenceLog, artifact_link, verify

COMMANDS = {
    'trusted-regression': ['bash', 'scripts/verify.sh'],
    'typecheck': ['npm', 'run', 'typecheck'],
    'node-tests': ['npm', 'test'],
    'phase3-tests': ['.venv/bin/python', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_phase3_*.py', '-v'],
}


def execute(label, output):
    output = Path(output)
    before = snapshot(Path.cwd())
    start = time.perf_counter_ns()
    with (output/(label+'.log')).open('xb') as log:
        result = subprocess.run(COMMANDS[label], stdout=log, stderr=subprocess.STDOUT, check=False)
    end = time.perf_counter_ns()
    record = {'schema_version': 'phase3-test-execution-1', 'label': label,
              'command': COMMANDS[label], 'exit_code': result.returncode,
              'clock': 'time.perf_counter_ns', 'start_ns': start, 'end_ns': end,
              'inputs_before': before, 'inputs_after': snapshot(Path.cwd()),
              'log_sha256': digest((output/(label+'.log')).read_bytes())}
    (output/(label+'.execution.json')).write_text(json.dumps(record, indent=2)+'\n')
    return result.returncode


def validate(record, log, current):
    label = record['label']
    if (record['schema_version'] != 'phase3-test-execution-1'
            or record['command'] != COMMANDS[label]
            or type(record['exit_code']) is not int
            or record['clock'] != 'time.perf_counter_ns'
            or type(record['start_ns']) is not int or type(record['end_ns']) is not int
            or not 0 <= record['start_ns'] < record['end_ns']
            or record['inputs_before'] != current or record['inputs_after'] != current
            or record['log_sha256'] != digest(log)):
        raise ValueError('Invalid test execution provenance')
    return record['exit_code'] == 0


def attach(root):
    root = Path(root)
    summary = json.loads((root/'summary.json').read_text())
    destination = root/'test-executions'
    destination.mkdir()
    links = []
    for label in COMMANDS:
        for suffix in ('.log', '.execution.json'):
            name = label+suffix
            shutil.copyfile(root.parent/name, destination/name)
            links.append(artifact_link(root, 'test-executions/'+name))
    ledger = EvidenceLog(root/'evidence.sqlite')
    ledger.append(summary['workload_digest'], 'test_attestation',
                  {'executions': list(COMMANDS)}, links,
                  expected_head=summary['evidence_head'])
    summary['evidence_head'] = verify(ledger.records(), artifact_root=root)
    (root/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')


def inspect(root):
    root = Path(root)
    summary = json.loads((root/'summary.json').read_text())
    records = EvidenceLog(root/'evidence.sqlite').records()
    verify(records, summary['evidence_head'], root)
    events = [r for r in records if r['event']['kind'] == 'test_attestation']
    if not events:
        return {'status': 'not_attested', 'reason': 'No test-run attestation in trial ledger'}
    if len(events) != 1:
        raise ValueError('Ambiguous test attestation')
    event = events[0]['event']
    links = [artifact_link(root, 'test-executions/'+label+suffix)
             for label in COMMANDS for suffix in ('.log', '.execution.json')]
    if (event['run_id'] != summary['workload_digest'] or event['links'] != links
            or event['payload'] != {'executions': list(COMMANDS)}):
        raise ValueError('Invalid test attestation binding')
    current = snapshot(Path.cwd())
    executions = []
    for label in COMMANDS:
        row = json.loads((root/'test-executions'/(label+'.execution.json')).read_text())
        if row['label'] != label:
            raise ValueError('Test execution label mismatch')
        passed = validate(row, (root/'test-executions'/(label+'.log')).read_bytes(), current)
        executions.append({'label': label, 'passed': passed, 'exit_code': row['exit_code'],
                           'duration_ns': row['end_ns']-row['start_ns'],
                           'log_sha256': row['log_sha256'], 'command': row['command']})
    return {'status': 'passed' if all(r['passed'] for r in executions) else 'failed',
            'sequence': events[0]['sequence'], 'source_digest': current['digest'],
            'executions': executions,
            'limitations': ['Skips and test counts remain visible in bound raw logs.',
                            'Local filesystem owner can replace source, logs, ledger and pinned head.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('label', choices=[*COMMANDS, 'attach'])
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    if args.label == 'attach':
        attach(args.output)
    else:
        raise SystemExit(execute(args.label, args.output))


if __name__ == '__main__': main()
