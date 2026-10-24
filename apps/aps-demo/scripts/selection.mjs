// Explicit field allowlists. No raw requests, receipts, identifiers, spans or keys.
export const version = 'aps-demo-sanitized-v1';
const pick = (object, keys) => Object.fromEntries(keys.map((k) => [k, object[k]]));
export function select(kind, d) {
  switch (kind) {
    case 'topology': return pick(d, ['id', 'nodes', 'communications', 'shared_state', 'constraints']);
    case 'scenarios': return d.map((s) => pick(s, ['id', 'node', 'deviation', 'cause', 'consequence', 'control']));
    case 'hazards': return d.hazards.map((h) => pick(h, ['id', 'node', 'intent', 'deviation', 'causes', 'consequences', 'safeguards', 'candidate_controls', 'assumptions', 'provenance', 'review_state', 'severity', 'likelihood', 'residual_risk', 'review_history']));
    case 'requirements': return d.requirements.map((r) => pick(r, ['id', 'hazard_id', 'hazard_digest', 'text', 'state', 'controls']));
    case 'policy': return d;
    case 'workload': return { ...pick(d, ['schema_version', 'seed', 'repeats', 'generator', 'configurations', 'status', 'digest']), cases: d.cases.map(c => pick(c, ['id', 'fault', 'digest'])) };
    case 'experiment': return {
      evidence_head: d.metrics.evidence_head,
      workload_digest: d.metrics.workload_digest,
      configurations: Object.fromEntries(Object.entries(d.metrics.configurations).map(([arm, m]) => [arm, pick(m, ['planned_trials', 'recorded_trials', 'missing_trials', 'completed_trials', 'completion_denominator', 'false_denials', 'false_denial_denominator', 'attack_attempts', 'unsafe_mutations', 'prevented_attempts', 'unresolved_attempts', 'evidence_sequences'])])),
      trials: d.trials.map((t) => ({
        ...pick(t, ['sequence', 'hash', 'fault', 'hazard_links', 'requirement_links', 'case_digest', 'case_id', 'completed', 'configuration', 'outcome', 'status']),
        calls: t.calls.map((c, index) => ({ index, ...pick(c, ['actor', 'action', 'decision', 'executed', 'cached', 'violations', 'logical_time_seconds']) })),
      })),
      tests: { ...pick(d.tests, ['status', 'sequence', 'source_digest', 'limitations']), executions: d.tests.executions.map((e) => pick(e, ['label', 'passed', 'exit_code', 'log_sha256'])) },
      limitations: d.limitations,
    };
    case 'acceptance': return { ...pick(d, ['schema_version', 'passed', 'evidence_head', 'limitations']), checks: d.checks.map((c) => pick(c, ['name', 'passed'])) };
    case 'stages': return d.trim().split('\n').map((line) => { const [name, exit] = line.split('\t'); return { name, exit: Number(exit) }; });
    default: throw new Error(`Unknown selector ${kind}`);
  }
}
export const sources = {
  topology: 'examples/procurement.json',
  scenarios: 'examples/scenarios.json',
  hazards: 'artifacts/report.json',
  requirements: 'artifacts/phase2/traceability.json',
  policy: 'policies/v1/config.json',
  workload: 'artifacts/phase3/acceptance-T95NAQ0y/run/workload.json',
  experiment: 'artifacts/phase3/acceptance-T95NAQ0y/dashboard/data.json',
  acceptance: 'artifacts/phase3/acceptance-T95NAQ0y/acceptance.json',
  stages: 'artifacts/phase3/acceptance-T95NAQ0y/checks.tsv',
};
