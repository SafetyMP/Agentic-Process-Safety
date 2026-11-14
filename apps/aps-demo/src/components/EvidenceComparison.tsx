import { experiment, routeLink } from '../data.ts';

type Trial = typeof experiment.trials[number];
type Call = Trial['calls'][number];

function indexedCalls(trial: Trial | undefined) {
  const counts = new Map<string, number>();
  return (trial?.calls ?? []).map(call => {
    const semantic = `${call.actor}/${call.action}`;
    const occurrence = (counts.get(semantic) ?? 0) + 1;
    counts.set(semantic, occurrence);
    return { key: `${semantic}/${occurrence}`, call };
  });
}

function CallCell({ call }: { call?: Call }) {
  if (!call) return <td><span className="muted">Not reached / not recorded</span></td>;
  return <td><strong>{call.decision.toUpperCase()} · {call.executed ? 'executed' : 'not executed'}</strong>{call.cached && <small>Cached result; no new execution</small>}<small>Logical time {call.logical_time_seconds}</small><small>Input violations: {call.violations.length ? call.violations.join(', ') : 'none recorded'}</small></td>;
}

/** Pairs only retained records sharing case identity and digest; never browser input. */
export function EvidenceComparison({ trial, onAttach }: { trial: Trial; onAttach?: (citation: string) => void }) {
  const matching = experiment.trials.filter(item => item.case_id === trial.case_id && item.case_digest === trial.case_digest);
  const b = matching.find(item => item.configuration === 'B');
  const c = matching.find(item => item.configuration === 'C');
  const bCalls = indexedCalls(b);
  const cCalls = indexedCalls(c);
  const keys = [...new Set([...bCalls.map(item => item.key), ...cCalls.map(item => item.key)])];
  const rows = keys.map(key => ({ key, b: bCalls.find(item => item.key === key)?.call, c: cCalls.find(item => item.key === key)?.call }));
  const divergence = b && c ? rows.find(row => row.b?.decision !== row.c?.decision || row.b?.executed !== row.c?.executed) : undefined;
  const divergenceIndex = divergence ? rows.indexOf(divergence) + 1 : null;
  const citation = divergence && b && c ? `Related recorded evidence, not this browser execution: case ${trial.case_id}, digest ${trial.case_digest}; B trial #${b.sequence} / C trial #${c.sequence}; paired event ${divergence.b?.actor ?? divergence.c?.actor} → ${divergence.b?.action ?? divergence.c?.action}. B: ${divergence.b ? `${divergence.b.decision}, ${divergence.b.executed ? 'executed' : 'not executed'}` : 'not reached / not recorded'}; C: ${divergence.c ? `${divergence.c.decision}, ${divergence.c.executed ? 'executed' : 'not executed'}` : 'not reached / not recorded'}.` : null;
  return <div className="recorded-comparison"><h3>{trial.case_id} · recorded comparison</h3><p>Selected trial #{trial.sequence} ({trial.configuration}). {b && c ? `B #${b.sequence} and C #${c.sequence} share the recorded case identity and digest.` : 'One or both comparison arms are absent; missing records are not evidence of agreement.'} Rows align by actor, action and occurrence; missing calls are not filled in.</p>
    {divergence ? <p className="notice"><strong>First recorded difference:</strong> {divergence.b?.actor ?? divergence.c?.actor} → {divergence.b?.action ?? divergence.c?.action}. B: {divergence.b ? `${divergence.b.decision}, ${divergence.b.executed ? 'executed' : 'not executed'}` : 'not reached / not recorded'}; C: {divergence.c ? `${divergence.c.decision}, ${divergence.c.executed ? 'executed' : 'not executed'}` : 'not reached / not recorded'}.</p> : <p className="notice">{b && c ? 'No difference in recorded decisions or execution flags between these paired calls.' : 'A complete recorded B/C comparison is unavailable.'}</p>}
    {divergence && <section className="decisive-recorded-event" aria-label="Decisive recorded event"><h4>Start with the event that changed the outcome</h4><p>Paired step {divergenceIndex}: <strong>{divergence.b?.actor ?? divergence.c?.actor} → {divergence.b?.action ?? divergence.c?.action}</strong>. Earlier shared calls remain available in the full trace below.</p><div className="table-scroll"><table><caption>Decisive recorded B/C event</caption><thead><tr><th>B · scope + budget</th><th>C · extended workflow checks</th></tr></thead><tbody><tr><CallCell call={divergence.b}/><CallCell call={divergence.c}/></tr></tbody></table></div><p>A violation flag describes the request; check the execution flag to see whether it produced an effect.</p>{onAttach && citation && <button onClick={() => onAttach(citation)}>Attach this recorded event to your reasoning</button>}</section>}
    <details className="recorded-full-trace"><summary>Inspect all {rows.length} paired recorded steps</summary><p>The full retained order is shown, including calls with equal outcomes. Missing calls are not filled in.</p>
    <div className="table-scroll"><table className="recorded-pair-table"><caption>Recorded B/C calls. A violation on a denied request does not mean an unsafe effect executed.</caption><thead><tr><th>Recorded step</th><th>B · scope + budget</th><th>C · extended workflow checks</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.key} className={row === divergence ? 'selected-row' : ''}><th scope="row">{index + 1}. {row.b?.actor ?? row.c?.actor}<small>{row.b?.action ?? row.c?.action}</small></th><CallCell call={row.b}/><CallCell call={row.c}/></tr>)}</tbody></table></div></details>
    <div className="button-row">{matching.map(item => <a key={item.sequence} href={routeLink('assurance', 'trial', String(item.sequence))}>Inspect trial #{item.sequence} · {item.configuration}</a>)}</div>
  </div>;
}
