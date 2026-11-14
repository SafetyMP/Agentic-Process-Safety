import type { ComparisonRun, LaneResult } from '../domain/comparison.ts';
import type { Mode } from '../domain/scenarios.ts';
import { getCase } from '../domain/cases.ts';
import { Badge } from './shared.tsx';

export const laneLabels: Record<Mode, string> = { A: 'No modeled checks', B: 'Tool permission + spend limit', C: 'Lifecycle checks added' };

export function outcomeLabel(result: LaneResult) {
  return result.decision === 'allow' ? 'EXECUTED · MODEL' : result.decision === 'deny' ? 'BLOCKED · MODEL' : 'REVIEW PENDING';
}

function Lane({ result }: { result: LaneResult }) {
  return <article className={`comparison-lane lane-${result.decision}`} aria-label={`Model ${result.mode} outcome`} data-mode={result.mode}>
    <div className="lane-label"><span className="lane-letter" aria-hidden="true">{result.mode}</span><h3>{laneLabels[result.mode]}</h3></div>
    <strong className="lane-result">{outcomeLabel(result)}</strong>
    <p className="lane-reason">{result.reason}</p>
    {result.effect ? <dl className="effect-summary"><div><dt>Illustrative orders</dt><dd>{result.effect.before.orders} → {result.effect.after.orders}</dd></div><div><dt>Committed sandbox units</dt><dd>{result.effect.before.spend} → {result.effect.after.spend}</dd></div></dl> : <p className="effect-unmodeled">Effect projection is not modeled for this case.</p>}
    <p className="lane-business-outcome">{result.businessOutcome}</p>
    {result.executedViolations.length > 0 ? <div className="constraint-status constraint-violated"><strong>Executed with a modeled constraint violation</strong><ul>{result.executedViolations.map(violation => <li key={violation}>{violation}</li>)}</ul></div>
      : result.violations.length > 0 ? <div className="constraint-status"><strong>Invalid condition present; no execution</strong><ul>{result.violations.map(violation => <li key={violation}>{violation}</li>)}</ul></div>
        : <p className="constraint-status">No violation of the modeled constraints identified. This does not establish real-world safety.</p>}
  </article>;
}

export function ComparisonView({ run, showBaseline = false, compact = false }: { run: ComparisonRun; showBaseline?: boolean; compact?: boolean }) {
  const modes: Mode[] = showBaseline ? ['B', 'C', 'A'] : ['B', 'C'];
  const definition = getCase(run.caseId);
  const b = run.results.B;
  const c = run.results.C;
  const decisive = c.checks.find(check => check.status === 'fail');
  const rules = [...new Set(modes.flatMap(mode => run.results[mode].checks.map(check => check.rule)))].filter(rule => rule !== 'Baseline');
  const difference = b.decision === c.decision
    ? `No outcome difference: both selected bundles ${b.decision === 'allow' ? 'permit this request' : b.decision === 'deny' ? 'block this request' : 'request review'}. Extra checks do not always change the outcome.`
    : `The outcome changes at ${decisive?.rule.toLowerCase() ?? 'the additional checks'}. B ${b.decision === 'allow' ? 'permits the request' : 'blocks the request'}; C ${c.decision === 'deny' ? 'blocks it' : c.decision === 'review' ? 'requests review without an effect' : 'permits it'}.`;
  return <section className={`comparison-view ${compact ? 'comparison-compact' : ''}`} aria-label={compact ? `Retained browser comparison ${run.id}` : 'Browser comparison'} data-testid={`comparison-${run.id}`}>
    <div className="section-title"><div><Badge tone="teal">Illustrative browser comparison</Badge><h2>{compact ? 'Retained comparison' : `Same request. ${showBaseline ? 'Three' : 'Two'} control bundles.`}</h2></div><span className="mono">{run.id}</span></div>
    <p className="comparison-input-summary"><strong>{definition.title}</strong> · {run.request.actor} actor · {run.request.amount} sandbox units · approval age {run.request.approvalAge}s</p>
    {run.parent && <p className="notice">Hypothetical recovery from {run.parent.runId}, lane C. Both lanes start from that denied lane’s no-effect state. The recorded trial does not demonstrate this recovery.</p>}
    <div className={`comparison-lanes ${showBaseline ? 'with-baseline' : ''}`}>{modes.map(mode => <Lane key={mode} result={run.results[mode]}/>)}</div>
    <p className="comparison-difference"><strong>What changed?</strong> {difference}</p>
    {!compact && <>
      <details className="comparison-checks"><summary>Compare every modeled check</summary><p>Not included means the bundle has no such check. Not evaluated means an earlier decision stopped evaluation.</p>
        <div className="table-scroll"><table className="check-matrix"><caption>Ordered checks against the same input snapshot</caption><thead><tr><th scope="col">Condition</th>{modes.map(mode => <th key={mode} scope="col">{mode} · {laneLabels[mode]}</th>)}</tr></thead><tbody>{rules.map(rule => <tr key={rule}><th scope="row">{rule}</th>{modes.map(mode => { const check = run.results[mode].checks.find(item => item.rule === rule); return <td key={mode}><strong>{!check ? 'Not included' : check.status === 'pass' ? '✓ Passes' : check.status === 'fail' ? '× Fails' : '— Not evaluated'}</strong>{check && <small>{check.reason}</small>}</td>; })}</tr>)}</tbody></table></div>
      </details>
      <details><summary>Input snapshot and comparison assumptions</summary><p>Both lanes receive this same request and starting state. Re-evaluation starts independently and does not accumulate another order.</p><pre>{JSON.stringify({ request: run.request, baseline: run.baseline, requestIdentity: run.requestIdentity, modelVersion: run.modelVersion }, null, 2)}</pre><ul>{run.assumptions.map(assumption => <li key={assumption}>{assumption}</li>)}</ul></details>
      <p className="muted comparison-fairness">B is this selected tool-and-spend comparator. Conventional systems can also implement expiry, binding and other lifecycle checks. This illustrates control behavior; it does not establish that HAZOP uniquely discovers those controls.</p>
    </>}
  </section>;
}
