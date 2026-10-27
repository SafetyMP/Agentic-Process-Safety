import { Technical, useAudience } from './AudienceView.tsx';
import type { ReactNode } from 'react';
import type { State, Action } from '../domain/simulation.ts';
import { decisionTrace, requestFor } from '../domain/simulation.ts';
import { stories, modes, type StoryId, type Mode } from '../domain/scenarios.ts';

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <header className="page-heading"><p className="eyebrow">{eyebrow}</p><h1 tabIndex={-1}>{title}</h1><p>{children}</p></header>;
}
export function Stat({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return <article className="stat"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
export function ModelControls({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  const { audience } = useAudience();
  const executive = audience === 'executive';
  const authority: Record<Mode, string> = { A: 'No gateway checks', B: 'Actor/tool scope and spend checks', C: 'Additional binding, expiry and review checks' };
  return <><p className="muted">Changing scenario, mode or seed clears this policy illustration and its decision history.</p><div className="control-grid"><label><span id="model-scenario">{executive ? 'Request situation' : 'Scenario'}</span><select aria-labelledby="model-scenario" value={state.story} onChange={e => dispatch({ type: 'configure', story: e.target.value as StoryId })}>{stories.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
    <label><span id="model-mode">{executive ? 'Authority model (A/B/C)' : 'Governance mode'}</span><select aria-labelledby="model-mode" value={state.mode} onChange={e => dispatch({ type: 'configure', mode: e.target.value as Mode })}>{Object.entries(modes).map(([id, name]) => <option key={id} value={id}>{id} · {executive ? authority[id as Mode] : name}</option>)}</select></label>
    <label><span id="model-seed">{executive ? 'Repeatable example number' : 'Deterministic seed'}</span><input aria-labelledby="model-seed" type="number" min="0" max="2147483647" value={state.seed} onChange={e => dispatch({ type: 'configure', seed: e.target.value })} /></label></div></>;
}
export function Review({ state, dispatch }: { state: State; dispatch: (a: Action) => void }) {
  if (!state.pending) return null;
  const story = stories.find(s => s.id === (state.fault ?? state.story))!;
  return <section className="notice" aria-label="Simulated review decision"><strong>Review required · SIMULATED</strong>
    <p>{story.objective}. {story.operation}.</p>
    <dl className="detail-grid"><div><dt>Request actor</dt><dd>{state.pending.actor}</dd></div><div><dt>Amount</dt><dd>{state.pending.amount} simulated units</dd></div><div><dt>Trigger</dt><dd>{state.events.at(-1)?.reason ?? 'Unknown'}</dd></div><div><dt>Scope</dt><dd>Current single-request browser illustration only</dd></div></dl>
    <p>Approve records this request as executed in the illustration. Deny records it as stopped. Neither issues production authorization or resolves the production objective-arbitration gap.</p>
    <div className="button-row"><button onClick={() => dispatch({ type: 'resolve', approved: true })}>Approve simulated request</button><button onClick={() => dispatch({ type: 'resolve', approved: false })}>Deny simulated request</button></div></section>;

}
export function EventLog({ state }: { state: State }) {
  const { audience } = useAudience();
  const trace = decisionTrace(state.mode, requestFor(state.fault ?? state.story, state.seed));
  return <section className="panel"><h2>{audience === 'executive' ? 'What happened to this request?' : 'Decision trace'} <span className="muted">/ {state.events.length} events</span></h2>
    <div aria-live="polite">{state.events.length === 0 ? <p className="empty">No decision yet. Three logical steps reach the gateway.</p> : state.events.map(e => <article className="event" key={e.id}><Badge tone={e.decision === 'deny' ? 'danger' : 'teal'}>{e.decision.toUpperCase()} · SIMULATED</Badge><strong>Tick {e.tick} · {e.stage}</strong><p>{e.reason}</p><small>{e.executed ? 'Simulated operation executed' : 'Operation not executed'} · {e.control} · amount {e.amount}</small></article>)}</div>
    <Technical>{state.events.length > 0 && <details><summary>Inspect ordered browser policy checks</summary><p>Short-circuit browser model only. A failed review rule requests review; later reviewer choices are separate events above. No OPA policy was executed.</p><div className="table-scroll"><table><caption>Rules for this simulated gateway attempt</caption><thead><tr><th>Rule</th><th>Result / terminal decision</th><th>Reason</th></tr></thead><tbody>{trace.map(r => <tr key={r.rule}><td>{r.rule}</td><td>{r.status}{r.terminal ? ` → ${r.terminal.toUpperCase()}` : ''}</td><td>{r.reason}</td></tr>)}</tbody></table></div></details>}</Technical>
  </section>;
}
