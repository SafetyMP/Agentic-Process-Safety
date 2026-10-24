import type { ReactNode } from 'react';
import type { State, Action } from '../domain/simulation.ts';
import { decisionTrace, requestFor } from '../domain/simulation.ts';
import { stories, modes, type StoryId, type Mode } from '../domain/scenarios.ts';

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <header className="page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{children}</p></header>;
}
export function Stat({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
export function ModelControls({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  return <div className="control-grid"><label><span id="model-scenario">Scenario</span><select aria-labelledby="model-scenario" value={state.story} onChange={e => dispatch({ type: 'configure', story: e.target.value as StoryId })}>{stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
    <label><span id="model-mode">Governance mode</span><select aria-labelledby="model-mode" value={state.mode} onChange={e => dispatch({ type: 'configure', mode: e.target.value as Mode })}>{Object.entries(modes).map(([id, name]) => <option key={id} value={id}>{id} · {name}</option>)}</select></label>
    <label><span id="model-seed">Deterministic seed</span><input aria-labelledby="model-seed" type="number" min="0" max="2147483647" value={state.seed} onChange={e => dispatch({ type: 'configure', seed: e.target.value })} /></label></div>;
}
export function Review({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  return state.pending ? <div className="notice"><strong>Review required · SIMULATED</strong><p>This choice records a browser outcome. It issues no production authorization.</p><div className="button-row"><button onClick={() => dispatch({ type: 'resolve', approved: true })}>Approve simulated request</button><button onClick={() => dispatch({ type: 'resolve', approved: false })}>Deny simulated request</button></div></div> : null;
}
export function EventLog({ state }: { state: State }) {
  const trace = decisionTrace(state.mode, requestFor(state.fault ?? state.story, state.seed));
  return <section className="panel"><h2>Decision trace <span className="muted">/ {state.events.length} events</span></h2>
    <div aria-live="polite">{state.events.length === 0 ? <p className="empty">No decision yet. Three logical steps reach the gateway.</p> : state.events.map(e => <article className="event" key={e.id}><Badge tone={e.decision === 'deny' ? 'danger' : 'teal'}>{e.decision.toUpperCase()} · SIMULATED</Badge><strong>Tick {e.tick} · {e.stage}</strong><p>{e.reason}</p><small>{e.executed ? 'Simulated operation executed' : 'Operation not executed'} · {e.control} · amount {e.amount}</small></article>)}</div>
    {state.events.length > 0 && <details><summary>Inspect ordered browser policy checks</summary><p>Short-circuit browser model only. A failed review rule requests review; later reviewer choices are separate events above. No OPA policy was executed.</p><div className="table-scroll"><table><caption>Rules for this simulated gateway attempt</caption><thead><tr><th>Rule</th><th>Result / terminal decision</th><th>Reason</th></tr></thead><tbody>{trace.map(r => <tr key={r.rule}><td>{r.rule}</td><td>{r.status}{r.terminal ? ` → ${r.terminal.toUpperCase()}` : ''}</td><td>{r.reason}</td></tr>)}</tbody></table></div></details>}
  </section>;
}
