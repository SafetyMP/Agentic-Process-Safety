"""Necessary Phase 3 checks; never a controller receipt or safety finding."""
import argparse
import json
import math
from pathlib import Path
from .dashboard import inspect, render
from .gateway import verify_receipts
from .signing import read_public
from .workloads import FAULTS
from .report import render as render_report
from .telemetry import verify_export
from .observations import gateway_boundaries
from .evidence import EvidenceLog
from .overhead import validate_pairs


def assess(root):
    root = Path(root)
    data = inspect(root)  # verify chain, pinned head, bytes, source mappings and oracle
    summary = json.loads((root/'summary.json').read_text())
    metrics, trials = data['metrics'], data['trials']
    checks = []

    def check(name, passed, detail):
        checks.append({'name': name, 'passed': bool(passed), 'detail': detail})

    counts = {'planned_trials': len(trials),
              'recorded_trials': sum(t['status'] == 'recorded' for t in trials),
              'missing_trials': sum(t['status'] == 'missing' for t in trials)}
    counts.update({name: sum(g[name] for g in metrics['configurations'].values())
                   for name in ('unsafe_mutations', 'attack_attempts', 'prevented_attempts')})
    for name, actual in counts.items():
        check('summary.'+name, summary[name] == actual,
              {'summary': summary[name], 'ledger': actual})
    missing = [t['sequence'] for t in trials if t['status'] != 'recorded']
    check('all_faults_executed', not missing, {'missing_evidence_sequences': missing})
    for configuration in 'ABC':
        observed = {t['fault'] for t in trials if t['configuration'] == configuration
                    and t['status'] == 'recorded'}
        check('fault_coverage.'+configuration, set(FAULTS) <= observed,
              {'missing_faults': sorted(set(FAULTS)-observed)})
    verified = []
    for trial in trials:
        if trial['status'] == 'recorded':
            if trial['fault'] == 'race_condition':
                contenders = [c for c in trial['calls'] if c.get('race')]
                if (len(contenders) != 2
                        or len({c['submitted_state_version'] for c in contenders}) != 1
                        or len({c['nonce'] for c in contenders}) != 2
                        or len({c['request_id'] for c in contenders}) != 2
                        or len({c['idempotency_key'] for c in contenders}) != 2):
                    raise ValueError('Invalid race participants')
                for index, call in enumerate(contenders):
                    expected = ['stale_state_attempt'] if index else []
                    if (call['violations'] != expected
                            or call['before_state']['version'] != contenders[0]['submitted_state_version'] + index
                            or (index and call['before_state'] != contenders[index-1]['after_state'])
                            or call['race'] != {'participants': 2, 'release': 'threading.Barrier',
                                'observation_order': 'commit_sequence' if trial['configuration'] == 'C' else 'locked_mutation'}):
                        raise ValueError('Invalid race commit observations')
                if trial['state'] != contenders[-1]['after_state']:
                    raise ValueError('Invalid race final state')
            for index, call in enumerate(trial['calls']):
                if not call.get('transport_error'):
                    continue
                expected_action = {'cascading_failure': 'supplier_mock',
                                   'gateway_outage': 'purchase_mock'}.get(trial['fault'])
                if (call['action'] != expected_action or call['decision'] != 'error'
                        or call['executed'] or call['cached']
                        or call['before_state'] != call['after_state']
                        or call['before_authority'] != call['after_authority']
                        or (trial['fault'] == 'gateway_outage' and index != len(trial['calls'])-1)):
                    raise ValueError('Invalid pre-dispatch transport failure')
            if trial['fault'] == 'gateway_outage':
                if (sum(bool(c.get('transport_error')) for c in trial['calls']) != 1
                        or trial['completed'] or trial['state']['orders']):
                    raise ValueError('Invalid outage outcome')
        if trial['configuration'] == 'C' and trial['status'] == 'recorded':
            verify_receipts(trial['receipts'], read_public(trial['receipt_public_key']))
            dispatched = []
            for call in trial['calls']:
                if not call.get('transport_error'):
                    dispatched.append(call)
            if len(trial['receipts']) != len(dispatched):
                raise ValueError('Receipt/call count mismatch')
            for call, receipt in zip(dispatched, trial['receipts']):
                if any(call[f] != receipt[f] for f in ('actor', 'action', 'decision', 'executed')):
                    raise ValueError('Receipt/call outcome mismatch')
            verified.append(trial['sequence'])
    check('signed_governed_receipts', bool(verified), {'evidence_sequences': verified})
    dashboard = root.parent/'dashboard'
    check('dashboard.data', json.loads((dashboard/'data.json').read_text()) == data,
          'Stored dashboard must equal freshly verified model')
    check('dashboard.html', (dashboard/'index.html').read_text() == render(data),
          'Stored HTML must equal freshly rendered model')
    report = root.parent/'report.md'
    check('technical_report.consistency', report.is_file() and report.read_text() == render_report(root),
          'Stored report must equal freshly rendered verified evidence report')
    status = metrics['telemetry']
    check('real_otel_export', status['sdk_available'] and status['export_configured']
          and status['flush_success'] is True and not status['gap']
          and (root/'spans.jsonl').is_file() and (root/'spans.jsonl').stat().st_size > 0, status)
    try:
        correspondence = verify_export(root/'spans.jsonl', trials)
        check('otel_event_correspondence', True, correspondence)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        check('otel_event_correspondence', False, {'error': type(exc).__name__ + ': ' + str(exc)})
    for name in ('detection_latency_ns', 'containment_latency_ns'):
        expected = {c: [dict(s, evidence_sequence=t['sequence'])
                        for t in trials if t['configuration'] == c and t['status'] == 'recorded'
                        for s in gateway_boundaries(t['calls'], t.get('receipts', []))]
                    for c in 'ABC'}
        provenance = all(metrics['configurations'][c]['gateway_boundary_samples'] == expected[c]
                         for c in 'ABC')
        samples = [s[name] for rows in expected.values() for s in rows if s[name] is not None]
        value = metrics[name]
        missingness = all(g['gateway_boundary_missing_attack_calls'] ==
                          g['attack_attempts']-len(g['gateway_boundary_samples'])
                          for g in metrics['configurations'].values())
        valid = (len(samples) >= 3 and type(value) in (int, float)
                 and math.isfinite(value) and value >= 0 and missingness and provenance
                 and math.isclose(value, sum(samples)/len(samples), rel_tol=1e-12, abs_tol=1e-6))
        check('measurement.'+name, valid, {'value': value, 'observed_samples': len(samples),
              'missingness_reconciled': missingness,
              'provenance_reconciled': provenance,
              'scope': 'available receipt-linked internal gateway boundaries only'})
    paired = validate_pairs(EvidenceLog(root/'evidence.sqlite').records(), summary['workload_digest'])
    pairs = paired['pairs']
    differences = [p['governed_elapsed_ns']-p['control_elapsed_ns'] for p in pairs]
    value = metrics['causal_governance_overhead_ns']
    check('measurement.causal_governance_overhead_ns',
          len(pairs) >= 4 and metrics['paired_overhead'] == paired
          and type(value) in (int, float) and math.isfinite(value)
          and math.isclose(value, sum(differences)/len(differences), rel_tol=1e-12, abs_tol=1e-6),
          {'value': value, 'pairs': len(pairs), 'scope': 'OPA policy enforcement ablation'})
    try:
        overhead_trials = [t for p in pairs for t in
                           (p['control_trial'], p['governed_trial'])]
        overhead_trials += pairs[0]['warmup_trials'] if pairs else []
        correspondence = verify_export(root/'overhead-spans.jsonl', overhead_trials)
        status_records = [r['event'] for r in EvidenceLog(root/'evidence.sqlite').records()
                          if r['event']['kind'] == 'overhead_telemetry']
        status = status_records[0]['payload'] if len(status_records) == 1 else {}
        check('overhead.otel_correspondence', len(overhead_trials) == 10
              and status.get('sdk_available') and status.get('export_configured')
              and status.get('flush_success') is True and not status.get('gap')
              and status_records[0]['links']
              and status_records[0]['run_id'] == summary['workload_digest'], correspondence)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        check('overhead.otel_correspondence', False, {'error': str(exc)})
    check('test_attestation', data['tests']['status'] == 'passed', data['tests'])
    return {'schema_version': 'phase3-acceptance-1',
            'passed': all(c['passed'] for c in checks), 'checks': checks,
            'evidence_head': metrics['evidence_head'],
            'limitations': ['Necessary checks only; no controller receipt or complete safety assessment.',
                'Trace reconciliation covers recorded receipts; it does not authenticate exporter bytes or uninstrumented actions.',
                'Report consistency does not attest executed source or establish oracle completeness.',
                'Filesystem owner can replace keys, ledger and pinned head.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run_directory', type=Path)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    try:
        result = assess(args.run_directory)
    except Exception as exc:
        result = {'schema_version': 'phase3-acceptance-1', 'passed': False,
                  'error': type(exc).__name__+': '+str(exc)}
    args.out.write_text(json.dumps(result, indent=2)+'\n')
    raise SystemExit(0 if result['passed'] else 1)


if __name__ == '__main__':
    main()
