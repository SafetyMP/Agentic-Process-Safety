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
export function EvidenceComparison({ trial }: { trial: Trial }) {
  const matching = experiment.trials.filter(item => item.case_id === trial.case_id && item.case_digest === trial.case_digest);
  const b = matching.find(item => item.configuration === 'B');
  const c = matching.find(item => item.configuration === 'C');
  const bCalls = indexedCalls(b);
  const cCalls = indexedCalls(c);
  const keys = [...new Set([...bCalls.map(item => item.key), ...cCalls.map(item => item.key)])];
  const rows = keys.map(key => ({ key, b: bCalls.find(item => item.key === key)?.call, c: cCalls.find(item => item.key === key)?.call }));
  const divergence = rows.find(row => row.b?.decision !== row.c?.decision || row.b?.executed !== row.c?.executed);
  return <div className="recorded-comparison"><h3>{trial.case_id} · recorded comparison</h3><p>Selected trial #{trial.sequence} ({trial.configuration}). B #{b?.sequence ?? 'unavailable'} and C #{c?.sequence ?? 'unavailable'} share the recorded case identity and digest. Rows align by actor, action and occurrence; missing calls are not filled in.</p>
    {divergence ? <p className="notice"><strong>First recorded difference:</strong> {divergence.b?.actor ?? divergence.c?.actor} → {divergence.b?.action ?? divergence.c?.action}. B: {divergence.b ? `${divergence.b.decision}, ${divergence.b.executed ? 'executed' : 'not executed'}` : 'not reached / not recorded'}; C: {divergence.c ? `${divergence.c.decision}, ${divergence.c.executed ? 'executed' : 'not executed'}` : 'not reached / not recorded'}.</p> : <p className="notice">No difference in recorded decisions or execution flags between these paired calls.</p>}
    <div className="table-scroll"><table className="recorded-pair-table"><caption>Recorded B/C calls. A violation on a denied request does not mean an unsafe effect executed.</caption><thead><tr><th>Recorded step</th><th>B · scope + budget</th><th>C · extended workflow checks</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.key} className={row === divergence ? 'selected-row' : ''}><th scope="row">{index + 1}. {row.b?.actor ?? row.c?.actor}<small>{row.b?.action ?? row.c?.action}</small></th><CallCell call={row.b}/><CallCell call={row.c}/></tr>)}</tbody></table></div>
    <div className="button-row">{matching.map(item => <a key={item.sequence} href={routeLink('assurance', 'trial', String(item.sequence))}>Inspect trial #{item.sequence} · {item.configuration}</a>)}</div>
  </div>;
}
