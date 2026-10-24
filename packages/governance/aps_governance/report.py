"""Deterministic technical report from verified finite experiment evidence."""
import argparse
import json
from pathlib import Path
from .dashboard import inspect


def render(root):
    root = Path(root)
    data = inspect(root)
    manifest = json.loads((root/'workload.json').read_text())
    metrics = data['metrics']
    missing_faults = sorted({t['fault'] for t in data['trials'] if t['status'] == 'missing'})
    lines = [
        '# APS Phase 3 finite local experiment report', '',
        'Human review mandatory. No production decision, risk acceptance or complete safety finding.', '',
        '## Methodology', '',
        'The SHA-256 counter generator creates matched task blocks for A, B and C. '
        'Trials run sequentially with fresh disposable SQLite state. A executes ordinary local '
        'sandbox mutations; B adds conventional actor/tool and budget checks; C calls the actual '
        'Gateway/OPA capability, context, approval, state and idempotency controls. '
        'All external actions are simulated. This is not a live benchmark campaign.', '',
        'The oracle compares recorded purchase and authority states independently of allow/deny labels. '
        'It measures implemented injected violations, not arbitrary unsafe behavior. '
        'Authorization and order mutations are separate events, not unique incidents. '
        'Missing trials are excluded from observed outcome denominators. '
        'False denials use only explicit benign controls. Fault trials can terminate at first denial.', '',
        'Dispatch clock scope: '+metrics['clock']+'. '
        'Logical approval-expiry time is injected and is not elapsed wall time. '
        'A/B and C execute different work; dispatch duration is descriptive, not causal overhead.', '',
        '## Recorded findings and denominators', '',
        '| Configuration | Planned | Recorded | Missing | Completed / recorded | Unsafe / attacks | Prevented / attacks | Unresolved | False denials / benign | Evidence |',
        '|---|---:|---:|---:|---|---|---|---:|---|---|',
    ]
    def reference(sequence):
        return f'[E{sequence}](dashboard/index.html#evidence-{sequence})'
    for config, group in metrics['configurations'].items():
        links = ', '.join(reference(s) for s in group['evidence_sequences'])
        lines.append(f"| {config} | {group['planned_trials']} | {group['recorded_trials']} | "
                     f"{group['missing_trials']} | {group['completed_trials']} / {group['completion_denominator']} | "
                     f"{group['unsafe_mutations']} / {group['attack_attempts']} | "
                     f"{group['prevented_attempts']} / {group['attack_attempts']} | {group['unresolved_attempts']} | "
                     f"{group['false_denials']} / {group['false_denial_denominator']} | {links} |")
    lines += ['', 'Every aggregate above is derived from the linked trial ledger records. '
              'These observations do not establish general safety or relative production effectiveness.', '',
              '## Bounded response observations', '',
              'These clocks measure exposure to observed denial and subsequent unchanged state/authority '
              'snapshots. They do not measure internal diagnosis, recovery, or undetected attacks. '
              'Missing samples are not zero. Each configuration retains request IDs and trial evidence links.', '',
              '```json', json.dumps({c: g['response_observation_summary']
                  for c, g in metrics['configurations'].items()}, indent=2, sort_keys=True), '```', '',
              '## Internal gateway boundary measurements', '',
              'Means below use available receipt-linked internal decision and transaction-exit clocks. '
              'Committed denial preserves simulated task state and delegated authority. '
              'This does not measure general fault diagnosis, physical containment or production recovery. '
              'Missing attacks remain unmeasured, not zero.', '',
              '```json', json.dumps({'detection_latency_ns': metrics['detection_latency_ns'],
                  'containment_latency_ns': metrics['containment_latency_ns'],
                  'configurations': {c: {'samples': g['gateway_boundary_samples'],
                      'missing_attack_calls': g['gateway_boundary_missing_attack_calls'],
                      'attack_attempts': g['attack_attempts']}
                      for c, g in metrics['configurations'].items()}}, indent=2, sort_keys=True), '```', '',
              '## Controlled paired policy enforcement overhead', '',
              'Matched successful workloads use the same C gateway, persistence, signing and telemetry. '
              'Only OPA policy evaluation/enforcement is ablated; gateway prechecks remain active. '
              'This estimates that incremental enforcement cost, not total governance stack cost. '
              'Four pairs and one warmup per arm are finite observations with scheduler and cache noise. '
              'Negative differences are retained. Raw intervals, receipts, setup and evidence sequences follow.', '',
              '```json', json.dumps({'causal_governance_overhead_ns': metrics['causal_governance_overhead_ns'],
                  'paired_overhead': metrics['paired_overhead']}, indent=2, sort_keys=True), '```', '',
              '## Fault coverage and inspectable outcomes', '',
              '| Case | Configuration | Status | Unsafe mutations | Evidence |',
              '|---|---|---|---|---|']
    for trial in data['trials']:
        unsafe = trial.get('outcome', {}).get('unsafe_mutations', 'unmeasured')
        lines.append(f"| {trial['case_id']} | {trial['configuration']} | {trial['status']} | {unsafe} | {reference(trial['sequence'])} |")
    lines += ['', '## Provenance and human review', '',
              'The following values come from the verified workload, pinned chain head and '
              'dashboard inspection. Hazard links are planned mappings, not demonstrated coverage. '
              'Requirement states and control labels do not establish approval or effectiveness.', '',
              '```json', json.dumps({'seed': manifest['seed'], 'repeats': manifest['repeats'],
                  'generator': manifest['generator'], 'workload_digest': manifest['digest'],
                  'input_digests': manifest['inputs'], 'evidence_head': metrics['evidence_head'],
                  'hazards': data['hazards'], 'requirements': data['requirements'],
                  'test_attestation': data['tests'], 'reported_telemetry_status': metrics['telemetry']},
                  indent=2, sort_keys=True), '```', '',
              '## Limitations and residual risks', '',
              'Missing fault adapters in this run: '+(', '.join(missing_faults) or 'none')+'. '
              'Internal gateway latencies cover only the available samples disclosed above. '
              'Total governance stack overhead remains unmeasured; the controlled policy ablation is disclosed above. '
              'Test execution provenance status: '+data['tests']['status']+'. '
              'Bound test logs retain failures, skips and counts; local attestations are not independent certification. '
              'Telemetry status is reported by the runner; '
              'this report does not independently establish SDK availability, trace completeness or export success. '
              'Local checks may fail under prohibited loopback binding; inspect the retained check logs.', '',
              'Unreviewed requirements require human review. Goal semantics beyond budget, physical truth, '
              'cancellation intent and other unmapped hazards remain outside the oracle. '
              'No production topology, network failure distribution or adversary population is represented. '
              'Seeds reproduce inputs, not nonces, keys, timings or cryptographic evidence bytes.', '',
              'Hash chaining detects alterations relative to a trusted pinned head. The filesystem owner '
              'can replace both ledger and head; there is no external trust anchor. Gateway transactions, '
              'experiment evidence and trace export are not atomic. Recorded trials are not a source-code '
              'execution attestation. Consistent artifacts can still share an incorrect oracle.', '',
              '## Reproduction', '',
              'The primary complete fresh attested assurance workflow, from the repository root '
              'with dependencies installed, is:', '',
              '```sh', 'bash scripts/verify-phase3.sh', '```', '',
              'This executes fresh source-bound tests, creates a seed-17/repeats-1 experiment, '
              'attaches genuine execution records, then generates dashboard, report and acceptance. '
              'It prints a fresh artifacts/phase3/acceptance-* output directory and exits nonzero '
              'if any stage fails. Inspect checks.tsv and retained logs. Never forge or reuse attestation.', '',
              'Within that directory report.md, acceptance.json and dashboard/ are siblings of run/. '
              'Relative evidence and dashboard links assume this layout. See docs/PHASE3_OPERATIONS.md '
              'for offline dependencies, inspection and seed controls.', '',
              f'This report records seed {manifest["seed"]}, repeats {manifest["repeats"]}. '
              'For unattested manual exploration of those inputs only, choose a new directory:', '',
              '```sh', 'export PYTHONPATH=packages/engine:packages/governance',
              f'.venv/bin/python -m aps_governance.experiment --seed {manifest["seed"]} --repeats {manifest["repeats"]} --out NEW_DIRECTORY/run',
              '.venv/bin/python -m aps_governance.dashboard NEW_DIRECTORY/run --out NEW_DIRECTORY/dashboard',
              '.venv/bin/python -m aps_governance.report NEW_DIRECTORY/run --out NEW_DIRECTORY/report.md',
              '```', '',
              'These manual commands are unattested and do not constitute full assurance reproduction. '
              'Acceptance will fail without genuine executed source-bound test attestation. '
              'Use the primary workflow for coherent fresh tests and evidence; do not transplant '
              'historical logs or attestations. Source or report-template changes require fresh '
              'tests and regenerated evidence. Passing acceptance is not human risk acceptance.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_directory', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    content = render(args.run_directory)
    with args.out.open('x', encoding='utf-8') as stream:
        stream.write(content)


if __name__ == '__main__':
    main()
