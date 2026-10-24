"""Offline inspection of verified finite experiments, without risk decisions."""
import argparse
import html
import json
from pathlib import Path
from .evidence import EvidenceLog
from .metrics import measure
from .workloads import verify_manifest
from .attestation import inspect as inspect_tests


def inspect(root):
    root = Path(root)
    metrics = measure(root)
    manifest = json.loads((root/'workload.json').read_text())
    verify_manifest(manifest)
    if metrics['workload_digest'] != manifest['digest']:
        raise ValueError('Summary workload mismatch')
    cases = {c['id']: c for c in manifest['cases']}
    seen, trials, hazards, requirements = set(), [], {}, {}
    for record in EvidenceLog(root/'evidence.sqlite').records():
        event = record['event']
        if event['kind'] != 'runtime_trial':
            continue
        row = event['payload']
        identity = (row['case_id'], row['configuration'])
        if identity in seen or identity[0] not in cases or identity[1] not in manifest['configurations']:
            raise ValueError('Duplicate or unknown trial')
        case = cases[identity[0]]
        if event['run_id'] != manifest['digest'] or row['case_digest'] != case['digest']:
            raise ValueError('Trial workload identity mismatch')
        if row['status'] not in ('recorded', 'missing'):
            raise ValueError('Unknown trial status')
        seen.add(identity)
        trials.append({'sequence': record['sequence'], 'hash': record['hash'],
                       'fault': case['fault'], 'hazard_links': case['hazard_links'],
                       'requirement_links': case['requirement_links'], **row})
        for hazard in case['hazard_links']:
            hazards[hazard['id']] = hazard
        for requirement in case['requirement_links']:
            requirements[requirement['id']] = requirement
    expected = {(c, config) for c in cases for config in manifest['configurations']}
    if seen != expected:
        raise ValueError('Incomplete planned trial ledger')
    return {'schema_version': 'phase3-dashboard-1', 'metrics': metrics,
            'hazards': list(hazards.values()), 'requirements': list(requirements.values()),
            'risk_review_queue': [r for r in requirements.values() if r['state'] != 'approved'],
            'incidents': [t['sequence'] for t in trials if t.get('outcome', {}).get('unsafe_mutations', 0)],
            'trials': trials,
            'tests': inspect_tests(root),
            'limitations': ['Hazard links are planned mappings, not demonstrated coverage.',
                            'Control implementation labels are proposals, not effectiveness claims.',
                            'Incidents are finite simulated oracle observations only.',
                            'Filesystem owner can replace ledger and pinned head together.',
                            'Human review required; no risk acceptance is performed.']}


def render(data):
    def dump(value):
        return html.escape(json.dumps(value, indent=2, ensure_ascii=True))
    sections = []
    for title, key in [('Measured outcomes and missingness', 'metrics'),
                       ('Planned hazard mappings; coverage not established', 'hazards'),
                       ('Proposed requirements and control status', 'requirements'),
                       ('Human risk review queue', 'risk_review_queue'),
                       ('Simulated incident evidence sequences', 'incidents'),
                       ('Test attestation status', 'tests'), ('Limitations', 'limitations')]:
        sections.append(f'<h2>{title}</h2><pre>{dump(data[key])}</pre>')
    for trial in data['trials']:
        label = html.escape(f"Evidence {trial['sequence']}: {trial['case_id']} / {trial['configuration']} / {trial['status']}")
        sections.append(f'<details id="evidence-{trial["sequence"]}"><summary>{label}</summary><pre>{dump(trial)}</pre></details>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'">'
            '<title>APS local assurance evidence</title><style>body{font:16px system-ui;max-width:1000px;margin:2em auto;padding:1em}'
            'pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f4f6;padding:1em}summary{cursor:pointer;padding:.6em}</style>'
            '<h1>APS local assurance evidence</h1><p>Finite local simulations. Human review mandatory. '
            'No complete safety finding. Expand trials to inspect calls, state, authority and receipts.</p>'
            + ''.join(sections) + '</html>')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_directory', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    data = inspect(args.run_directory)
    args.out.mkdir(parents=True, exist_ok=False)
    (args.out/'data.json').write_text(json.dumps(data, indent=2)+'\n')
    (args.out/'index.html').write_text(render(data))


if __name__ == '__main__': main()
