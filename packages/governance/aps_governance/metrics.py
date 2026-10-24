"""Descriptive metrics derived from verified runtime evidence, not safety proof."""
import argparse
import json
from pathlib import Path
from .evidence import EvidenceLog, verify
from .experiment import classify
from .observations import rejection_observations, summarize_observations, gateway_boundaries
from .gateway import verify_receipts
from .signing import read_public


def measure(root):
    root = Path(root)
    summary = json.loads((root/'summary.json').read_text())
    records = EvidenceLog(root/'evidence.sqlite').records()
    verify(records, summary['evidence_head'], root)
    groups = {}
    for configuration in ('A', 'B', 'C'):
        selected = [r for r in records if r['event']['kind'] == 'runtime_trial'
                    and r['event']['payload']['configuration'] == configuration]
        rows = [r['event']['payload'] for r in selected]
        observed = [r for r in rows if r['status'] == 'recorded']
        for row in observed:
            if configuration == 'C':
                verify_receipts(row['receipts'], read_public(row['receipt_public_key']))
            if row['outcome'] != classify(row['calls']):
                raise ValueError('Outcome disagrees with observed mutations')
        benign = [r for r in observed if r['case_id'].endswith('-benign')]
        calls = [c for r in observed for c in r['calls']]
        internal = [dict(sample, evidence_sequence=record['sequence'])
                    for record in selected if record['event']['payload']['status'] == 'recorded'
                    for sample in gateway_boundaries(record['event']['payload']['calls'],
                                                     record['event']['payload'].get('receipts', []))]
        observations = rejection_observations(calls)
        response_summary = summarize_observations(calls)
        response_summary['sample_evidence'] = [
            {'sequence': record['sequence'], 'request_id': call['request_id']}
            for record in selected if record['event']['payload']['status'] == 'recorded'
            for call in record['event']['payload']['calls'] if call.get('safety_observation')]
        durations = [c['elapsed_ns'] for c in calls]
        if any(type(n) is not int or n < 0 for n in durations):
            raise ValueError('Invalid dispatch duration')
        attacks = sum(r['outcome']['attack_attempts'] for r in observed)
        unsafe = sum(r['outcome']['unsafe_mutations'] for r in observed)
        groups[configuration] = {
            'planned_trials': len(rows), 'recorded_trials': len(observed),
            'missing_trials': len(rows)-len(observed),
            'completed_trials': sum(r['completed'] for r in observed),
            'completion_denominator': len(observed),
            'benign_trials': len(benign), 'benign_completed': sum(r['completed'] for r in benign),
            'false_denials': sum(any(c['decision'] == 'deny' for c in r['calls']) for r in benign),
            'false_denial_denominator': len(benign),
            'attack_attempts': attacks, 'unsafe_mutations': unsafe,
            'unsafe_rate': unsafe/attacks if attacks else None,
            'prevented_attempts': sum(r['outcome']['prevented_attempts'] for r in observed),
            'unresolved_attempts': sum(r['outcome']['unresolved_attempts'] for r in observed),
            'rejection_observations': observations,
            'response_observation_summary': response_summary,
            'gateway_boundary_samples': internal,
            'gateway_boundary_scope': 'exposure to gateway decision / committed denial; task state and authority only',
            'gateway_boundary_missing_attack_calls': attacks-len(internal),
            'rejection_observation_denominator': len(observations),
            'unmeasured_attack_attempts': attacks-len(observations),
            'dispatch_calls': len(calls), 'dispatch_total_ns': sum(durations),
            'dispatch_mean_ns': sum(durations)/len(durations) if durations else None,
            'evidence_sequences': [r['sequence'] for r in selected]}
    from .overhead import validate_pairs
    paired = validate_pairs(records, summary['workload_digest'])
    differences = [p['governed_elapsed_ns']-p['control_elapsed_ns'] for p in paired['pairs']]
    latencies = {}
    for field in ('detection_latency_ns', 'containment_latency_ns'):
        values = [sample[field] for group in groups.values()
                  for sample in group['gateway_boundary_samples'] if sample[field] is not None]
        latencies[field] = sum(values)/len(values) if values else None
    return {'schema_version': 'phase3-metrics-1', 'evidence_head': summary['evidence_head'],
            'workload_digest': summary['workload_digest'], 'configurations': groups,
            'clock': summary['clock'], 'telemetry': summary['telemetry'],
            **latencies,
            'paired_overhead': paired,
            'causal_governance_overhead_ns': sum(differences)/len(differences) if differences else None,
            'limitations': ['Missing fault adapters excluded from outcome denominators.',
                'False denials measured only on explicit benign controls.',
                'Dispatch timings include different work in A/B versus C; not causal overhead.',
                'Per-configuration rejection observations measure exposure-to-denial-response and verified unchanged snapshots, not internal fault diagnosis or recovery.',
                'Aggregate latencies are sample-weighted means of available validated internal gateway boundaries only; missing attacks are not zero. Coverage excludes races, cache responses, transport failures and undetected attacks.',
                'Detection means gateway decision, not general fault diagnosis. Containment means committed denial with unchanged task state and delegated authority, not physical or production recovery.',
                'Local chain and head can both be replaced by filesystem owner.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_directory', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out.write_text(json.dumps(measure(args.run_directory), indent=2)+'\n')


if __name__ == '__main__': main()
