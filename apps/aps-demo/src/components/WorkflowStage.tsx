import { useEffect, useRef, useState } from 'react';
import { MODE_LABELS, SCENARIOS, scenarioSpec, selectWorkflow } from '../workflow/index.ts';
import type { AgentId, Mode, RunSpec, ScenarioId, WorkflowCommand, WorkflowState } from '../workflow/index.ts';
import { Badge, Stat } from './shared.tsx';
import { BusinessDebrief, BusinessExercise, BusinessOutcomeGuide, BusinessRoles, BusinessScenarioNote } from './BusinessContext.tsx';

const roles: Record<AgentId, string> = {
  orchestrator: 'Coordinate the task and purchase boundary', demand: 'Derive demand from task input',
  inventory: 'Calculate the replenishment quantity', supplier: 'Construct a simulated quote',
  finance: 'Issue a bound simulated approval', purchase: 'Propose an order and confirm its outcome',
};
const words = (value: string) => value.replaceAll('-', ' ').replaceAll('_', ' ');
const field = (value: unknown) => value === null || value === undefined ? 'Not available yet' : typeof value === 'object' ? JSON.stringify(value) : String(value);

type Props = {
  state: WorkflowState;
  onCommand: (command: WorkflowCommand) => void;
  onImport: (text: string) => { ok: boolean; message: string };
  onExport: () => string;
};

export function WorkflowSummary({ state }: { state: WorkflowState }) {
  const view = selectWorkflow(state);
  return <section className="notice" aria-label="Current workflow run"><strong>New browser workflow · {view.scenarioTitle}</strong>
    <p>{view.label}</p><p>{words(view.status)} · logical time {view.logicalTime} · {view.metrics.committedOrders} orders · {view.metrics.spent} simulated units spent · business confirmation: {view.metrics.completed ? 'confirmed' : 'not confirmed'} · safe model completion: {view.metrics.safeCompleted ? 'yes' : 'no'} · unsafe effects {view.metrics.unsafeCommittedEffects}</p>
    <a href="#/simulator">Inspect agent handoffs and causal events →</a></section>;
}

export function WorkflowStage({ state, onCommand, onImport, onExport }: Props) {
  const view = selectWorkflow(state);
  const [scenario, setScenario] = useState<ScenarioId>(state.spec.scenario);
  const [mode, setMode] = useState<Mode>(state.spec.mode);
  const [schedule, setSchedule] = useState<RunSpec['schedule']>(state.spec.schedule);
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('orchestrator');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [replayText, setReplayText] = useState('');
  const [exportText, setExportText] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const [messageFocusRequest, setMessageFocusRequest] = useState(0);
  const messageInspector = useRef<HTMLHeadingElement>(null);
  const [importNotice, setImportNotice] = useState('');
  const [pace, setPace] = useState(900);
  const inspector = useRef<HTMLHeadingElement>(null);
  const agent = view.agents.find(a => a.id === selectedAgent)!;
  const event = view.events.find(e => e.id === selectedEvent);
  const message = view.messages.find(m => m.id === messageId);
  const latest = view.events.at(-1);
  const c = view.controls;
  const scenarioDescription = SCENARIOS.find(s => s.id === state.spec.scenario)?.description;
  useEffect(() => {
    if (!view.running) return;
    const timer = window.setInterval(() => onCommand({ type: 'timer' }), pace);
    return () => window.clearInterval(timer);
  }, [view.running, pace, onCommand]);
  useEffect(() => { if (selectedEvent) inspector.current?.focus(); }, [selectedEvent]);
  useEffect(() => { if (messageFocusRequest) messageInspector.current?.focus(); }, [messageFocusRequest]);
  function inspectEvent(id: string | null) {
    if (!id) return;
    const selected = view.events.find(item => item.id === id);
    setSelectedEvent(id);
    if (selected) { setSelectedAgent(selected.actor); setMessageId(selected.messageId ?? null); }
  }
  function inspectMessage(id: string) { setMessageId(id); setMessageFocusRequest(count => count + 1); }
  function prepareReplay() {
    setExportText('');
    try { setExportText(onExport()); setExportNotice('Current replay prepared; no evidence file was created.'); }
    catch (error) { setExportNotice(`Replay export unavailable: ${error instanceof Error ? error.message : 'Unknown export error'}. No truncated replay was produced.`); }
  }
  function replaceRun() {
    onCommand({ type: 'configure', spec: scenarioSpec(scenario, mode, schedule) });
    setSelectedEvent(null); setMessageId(null); setExportText(''); setExportNotice(''); setImportNotice('');
  }
  function resetRun() {
    onCommand({ type: 'reset' }); setSelectedEvent(null); setMessageId(null); setExportText(''); setExportNotice(''); setImportNotice('');
  }
  return <div className="workflow-workspace">
    <section className="workflow-intro" aria-labelledby="workflow-title">
      <p className="eyebrow">03 / GENERATED WORKFLOW</p><h1 id="workflow-title">Follow the handoff.<br/>Understand the consequence.</h1>
      <p>Six local state machines exchange typed messages against one in-memory procurement world. Step through the work, inspect a boundary, and follow recovery without erasing its history.</p>
      <div className="workflow-boundary"><strong>{view.label}</strong><span>New browser run · frozen recorded experiments remain separate in Assurance.</span></div>
    </section>
    <BusinessExercise task={state.spec.task}/>
    <section className="panel" aria-labelledby="workflow-controls-title">
      <div className="section-title"><h2 id="workflow-controls-title">Choose the situation</h2><Badge>Illustrative browser simulation</Badge></div>
      <div className="control-grid">
        <label>Workflow scenario<select value={scenario} onChange={e => setScenario(e.target.value as ScenarioId)}>{SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label>Workflow comparator<select value={mode} onChange={e => setMode(e.target.value as Mode)}>{Object.entries(MODE_LABELS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Proposal schedule<select value={schedule} onChange={e => setSchedule(e.target.value as RunSpec['schedule'])}><option value="proposal-1-first">Proposal 1 first</option><option value="proposal-2-first">Proposal 2 first</option></select></label>
      </div>
      <p className="muted">Selections are a draft. Apply starts a new browser run and clears this workflow's history, world and metrics. Reset restores the active run's initial specification. Neither action changes frozen evidence.</p>
      <button onClick={replaceRun}>Apply selection and start new run</button>
      <div className="workflow-active"><strong>Active: {view.scenarioTitle} · {view.modeLabel}</strong><p>{scenarioDescription}</p><p>Active task: demand {state.spec.task.demand}, stock {state.spec.task.stock}, unit price {state.spec.task.unitPrice}, budget {state.spec.task.budget}; approval TTL {state.spec.task.approvalTtl} logical seconds.</p>{state.spec.scenario === 'purchase-race' && <p>Simulated interleaving · {words(state.spec.schedule)}. This is a deterministic queue order, not parallel operating-system execution.</p>}<small>Seed {state.spec.seed} is replay metadata; it does not vary this v1 workflow.</small><BusinessScenarioNote scenario={state.spec.scenario}/></div>
      <div className="button-row">
        <button className="primary" disabled={!c.canStart} onClick={() => onCommand({ type: 'start' })}>Start workflow</button>
        <button disabled={!c.canStep} onClick={() => onCommand({ type: 'step' })}>Step one transition</button>
        <button disabled={!c.canPause} onClick={() => onCommand({ type: 'pause' })}>Pause workflow</button>
        <button disabled={!c.canReset} onClick={resetRun}>Reset workflow and clear history</button>
        <label>Playback pace<select value={pace} onChange={e => setPace(Number(e.target.value))}><option value={1400}>Slow · 1.4 seconds</option><option value={900}>Medium · 0.9 seconds</option><option value={300}>Fast · 0.3 seconds</option></select></label>
      </div>
      <p role="status" aria-label="Workflow status" className="workflow-status">{words(view.status)} · {view.running ? 'playing' : 'paused'} · logical time {view.logicalTime} · {view.transitionCount} transitions. {words(c.reasonCode)}.</p>
      <p className="muted">Step consumes one queued transition and can emit several linked events. Playback pace never changes logical time rules. Manual stepping works without animation.</p>
      {c.canRecover && c.blockedEventId && <section className="workflow-decision" aria-label="Approval refresh decision"><h3>Expired approval: request a fresh decision</h3><p>No order is implied by this block. Request finance to derive a new bound simulated approval from the existing quote; the expired approval and its denial stay in the trace. This does not extend a grant or issue production authorization.</p><p>Blocked event: <button className="text-button" onClick={() => inspectEvent(c.blockedEventId)}>{c.blockedEventId}</button></p><button onClick={() => onCommand({ type: 'recover', blockedEventId: c.blockedEventId! })}>Request one approval refresh</button></section>}
      {c.canReconcile && c.unknownEventId && <section className="workflow-decision" aria-label="Unknown outcome decision"><h3>The response is missing; the order may already exist</h3><p>Reconcile queries the simulated world for the existing intent. It does not place another order. A missing response is not proof of failure; inspect committed effects below.</p><p>Unknown-outcome event: <button className="text-button" onClick={() => inspectEvent(c.unknownEventId)}>{c.unknownEventId}</button></p><button onClick={() => onCommand({ type: 'reconcile', unknownEventId: c.unknownEventId! })}>Reconcile existing order once</button></section>}
    </section>
    <div className="stats workflow-metrics" aria-label="Observed simulated effects">
      <Stat label="Committed orders" value={view.metrics.committedOrders} note="Actual in-memory order records"/>
      <Stat label="Simulated spend" value={view.metrics.spent} note="Derived from committed effects"/>
      <Stat label="Unsafe committed effects" value={view.metrics.unsafeCommittedEffects} note="Independent model oracle; no real-world estimate"/>
      <Stat label="Task confirmed" value={view.metrics.completed ? 'Yes' : 'No'} note="Business confirmation only; inspect unsafe effects"/>
      <Stat label="Safe model completion" value={view.metrics.safeCompleted ? 'Yes' : 'No'} note="Confirmation and all independent model invariants"/>
    </div>
    <BusinessOutcomeGuide/>
    <section className="panel" aria-labelledby="workflow-agents-title"><div className="section-title"><h2 id="workflow-agents-title">Who is doing the work?</h2><span>{view.metrics.pendingMessages} pending messages</span></div>
      <BusinessRoles/>
      <p className="muted">States below come from the workflow engine. Selecting a role reveals its local state; a waiting agent has not completed its task.</p>
      <div className="workflow-agents">{view.agents.map(a => <button key={a.id} className={`workflow-agent ${a.status}`} aria-pressed={a.id === selectedAgent} onClick={() => setSelectedAgent(a.id)}><strong>{a.id}</strong><span>{words(a.status)}</span><small>Inbox {a.inbox.length} · consumed {a.consumedMessageIds.length}</small></button>)}</div>
      <div className="workflow-agent-detail" aria-label="Workflow agent inspector"><h3 className="capitalize">{agent.id}: {roles[agent.id]}</h3><p>State: {words(agent.status)} · last event: {agent.lastEventId ? <button className="text-button" onClick={() => inspectEvent(agent.lastEventId)}>{agent.lastEventId}</button> : 'none'}</p><dl className="workflow-fields">{Object.entries(agent.local).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{field(value)}</dd></div>)}</dl></div>
    </section>
    <div className="workflow-trace-layout">
      <section className="panel" aria-labelledby="workflow-timeline-title"><h2 id="workflow-timeline-title">What caused this?</h2><p className="muted">Logical order with explicit causal parents. Each row is emitted by the engine; no authored conversation is used.</p><p className="workflow-latest" aria-live="polite" aria-atomic="true">Latest: {latest ? `${latest.actor} · ${words(latest.type)} · logical time ${latest.logicalTime}` : 'No event'}</p>
        <ol className="workflow-timeline">{view.events.map(e => <li key={e.id}><button aria-pressed={e.id === selectedEvent} onClick={() => inspectEvent(e.id)}><small>{e.id} · T {e.logicalTime} · {e.actor}</small><strong>{words(e.type)}</strong>{e.reasonCode && <span>{words(e.reasonCode)}</span>}<small>World {e.worldVersionBefore} → {e.worldVersionAfter} · parents {e.parentEventIds.length}</small></button></li>)}</ol>
      </section>
      <section className="panel workflow-event-inspector" aria-label="Causal event inspector"><h2 ref={inspector} tabIndex={-1}>Event inspector</h2>{event ? <><Badge>SIMULATED event</Badge><h3>{event.id} · {words(event.type)}</h3><p>Actor {event.actor} · logical time {event.logicalTime} · transition {event.transitionId}</p><p>World version {event.worldVersionBefore} → {event.worldVersionAfter}</p><p>{event.reasonCode ? words(event.reasonCode) : 'No decision reason attached to this event.'}</p><h3>Direct causes</h3>{event.parentEventIds.length ? <ul>{event.parentEventIds.map(id => <li key={id}><button className="text-button" onClick={() => inspectEvent(id)}>{id}</button></li>)}</ul> : <p>Root event; no causal parent supplied.</p>}{event.messageId && <button onClick={() => inspectMessage(event.messageId!)}>Inspect message {event.messageId}</button>}<h3>Typed event data</h3><pre>{JSON.stringify(event.data, null, 2)}</pre></> : <p>Select an event to inspect its actor, exact data, direct causes and world effect.</p>}</section>
    </div>
    <section className="panel" aria-labelledby="workflow-messages-title"><h2 id="workflow-messages-title">Typed handoffs</h2><p className="muted">Queued, delivered and consumed are distinct states. Dropped messages remain visible.</p><div className="table-scroll"><table><caption>Generated messages in the active browser run</caption><thead><tr><th>Message</th><th>From → to</th><th>Kind</th><th>Lifecycle</th><th>Logical time</th></tr></thead><tbody>{view.messages.map(m => <tr key={m.id}><td><button className="text-button" aria-pressed={m.id === messageId} onClick={() => inspectMessage(m.id)}>{m.id}</button></td><td>{m.from} → {m.to}</td><td>{m.kind}</td><td>{m.status}</td><td>Created {m.createdAt} · due {m.deliverAt}<small>Delivered {m.deliveredAt ?? 'not yet'} · consumed {m.consumedAt ?? 'not yet'}</small></td></tr>)}</tbody></table></div>{!view.messages.length && <p>No messages generated yet.</p>}
      {message && <section className="workflow-message-inspector" aria-label="Typed message inspector"><h3 ref={messageInspector} tabIndex={-1}>{message.id} · {message.from} → {message.to}</h3><p>{message.kind} · {message.status} · task {message.taskId} · context {message.contextId}</p><p>Caused by {message.causedByEventIds.map(id => <button key={id} className="text-button" onClick={() => inspectEvent(id)}>{id} </button>)}</p><pre>{JSON.stringify(message.payload, null, 2)}</pre></section>}
    </section>
    <section className="panel" aria-labelledby="workflow-world-title"><h2 id="workflow-world-title">What changed in the world?</h2><p>Simulated world version {view.worldSummary.version} · observed stock {view.worldSummary.stock}. Placing an order does not imply goods arrived.</p>
      <div className="workflow-world-grid"><div><h3>Derived work</h3><dl><dt>Demand</dt><dd>{field(view.worldSummary.demand)}</dd><dt>Replenishment quantity</dt><dd>{field(view.worldSummary.quantity)}</dd><dt>Quote</dt><dd>{view.worldSummary.quote ? `${view.worldSummary.quote.id} · ${view.worldSummary.quote.amount} units` : 'Not available yet'}</dd></dl></div><div><h3>Simulated approval, not authorization</h3>{view.worldSummary.approvals.length ? view.worldSummary.approvals.map(a => <details key={a.id}><summary>{a.id} · expires T {a.expiresAt} · {a.consumedByOrderId ? `consumed by ${a.consumedByOrderId}` : 'not consumed'}</summary><pre>{JSON.stringify(a, null, 2)}</pre></details>) : <p>No simulated approvals issued.</p>}</div><div><h3>Committed effects</h3>{view.worldSummary.orders.length ? view.worldSummary.orders.map(o => <details key={o.id}><summary>{o.id} · {o.amount} units · SIMULATED</summary><pre>{JSON.stringify(o, null, 2)}</pre></details>) : <p>No orders committed.</p>}</div></div>
      <p>{view.metrics.deniedProposals} denied proposals · {view.metrics.cachedResults} cached results · {view.metrics.recoveryAttempts} refresh attempts · {view.metrics.reconciliationAttempts} reconciliation attempts. A denial is not automatically credited as prevention.</p>
    </section>
    <section className="panel" aria-labelledby="workflow-observations-title"><h2 id="workflow-observations-title">Model observations and limits</h2><p>These are independent observations of simulated effects, not test pass provenance, safety certification or production enforcement. Business confirmation alone does not imply a safe or correct outcome; A/B can confirm work while committing unsafe effects.</p><ul className="workflow-invariants">{view.invariants.map(i => <li key={i.id}><strong>{i.id}: {i.status}</strong><span>{words(i.explanationCode)}</span><div>{i.evidenceEventIds.map(id => <button key={id} className="text-button" onClick={() => inspectEvent(id)}>{id} </button>)}</div></li>)}</ul><ul>{view.limitations.map(l => <li key={l}>{l}</li>)}</ul><p>Human review and production objective arbitration are unavailable in this workflow candidate. No real permission is issued.</p></section>
    <BusinessDebrief/>
    <section className="panel" aria-labelledby="workflow-replay-title"><h2 id="workflow-replay-title">Inspect or restore a browser replay</h2><p>Prepared exports are snapshots; prepare again after further transitions. Versioned replay is recomputed by the engine before adoption. Replay inputs are user-supplied. A matching fixture digest shows consistency, not membership of a trusted catalog, authenticated identity or safety. A valid import replaces this workflow's history; an invalid import leaves it intact.</p><button onClick={prepareReplay}>Prepare current replay JSON</button><p role="status" aria-label="Replay export status">{exportNotice}</p>{exportText && <label>Prepared replay snapshot<textarea readOnly value={exportText} rows={6}/></label>}<label>Replay JSON to validate<textarea value={replayText} maxLength={262144} onChange={e => setReplayText(e.target.value)} rows={5}/></label><button disabled={!replayText.trim()} onClick={() => { const result = onImport(replayText); setImportNotice(result.message); if (result.ok) { setSelectedEvent(null); setMessageId(null); setExportText(''); } }}>Validate replay and replace current run</button><p role="status" aria-label="Replay import status">{importNotice}</p><details><summary>Active specification and replay identity</summary><p>{view.runKey}</p><p>Specification identity, not a unique session or authenticated receipt.</p><pre>{JSON.stringify(state.spec, null, 2)}</pre></details></section>
  </div>;
}
