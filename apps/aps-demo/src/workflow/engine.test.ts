import { describe, expect, it } from 'vitest';
import { createWorkflow, workflowReducer, scenarioSpec, selectWorkflow, SCENARIOS } from './index.ts';
import type { Mode, WorkflowState } from './index.ts';
import { canonical } from './scenarios.ts';
import { semanticState } from './replay.ts';

export function advanceTo(s: WorkflowState, predicate: (s: WorkflowState) => boolean): WorkflowState {
  for (let n = 0; n < 110 && !predicate(s); n++) {
    if (!selectWorkflow(s).controls.canStep) break;
    s = workflowReducer(s, { type: 'step' });
  }
  return s;
}
export function settle(s: WorkflowState): WorkflowState { return advanceTo(s, s => !selectWorkflow(s).controls.canStep); }
function finish(s: WorkflowState): WorkflowState {
  s = settle(s);
  if (s.status === 'blocked-recoverable') s = settle(workflowReducer(s, { type: 'recover', blockedEventId: s.blockedEventId! }));
  if (s.status === 'outcome-unknown') s = settle(workflowReducer(s, { type: 'reconcile', unknownEventId: s.unknownEventId! }));
  return s;
}

describe('E01–03 executable messages and independent scenario arithmetic', () => {
  for (const scenario of SCENARIOS) for (const mode of ['A', 'B', 'C'] as Mode[]) {
    it(`${scenario.id}/${mode} derives its effects and confirms only after handoffs`, () => {
      const original = createWorkflow(scenarioSpec(scenario.id, mode));
      const snapshot = structuredClone(original);
      const s = finish(original), v = selectWorkflow(s);
      expect(original).toEqual(snapshot);
      expect(s.status).toBe('completed');
      expect(s.world.demand).toBe(100); expect(s.world.quantity).toBe(80); expect(s.world.quote?.amount).toBe(400);
      const unsafe = scenario.id === 'approval-delay' && mode !== 'C' || scenario.id === 'purchase-race' && mode !== 'C';
      const orders = scenario.id === 'purchase-race' && mode !== 'C' ? 2 : 1;
      expect(s.world.orders).toHaveLength(orders); expect(s.world.spent).toBe(orders * 400);
      expect(v.metrics.completed).toBe(true); expect(v.metrics.safeCompleted).toBe(!unsafe); expect(v.metrics.unsafeCommittedEffects).toBe(unsafe ? 1 : 0);
      for (const id of ['demand', 'inventory', 'supplier', 'finance', 'purchase'] as const) expect(s.agents[id].consumedMessageIds.length).toBeGreaterThan(0);
      for (const m of s.messages) {
        if (m.status === 'consumed') { expect(m.deliveredAt).toBeDefined(); expect(m.consumedAt).toBeGreaterThanOrEqual(m.deliveredAt!); }
      }
      const seen = new Set<string>();
      for (const e of s.events) { expect(seen.has(e.id)).toBe(false); expect(e.parentEventIds.every(id => seen.has(id))).toBe(true); if (e.type !== 'run-created') expect(e.parentEventIds.length).toBeGreaterThan(0); seen.add(e.id); }
    });
  }
  it('does not complete at approval or commit; versioned derived stages are real', () => {
    let s = createWorkflow();
    s = advanceTo(s, s => s.world.approvals.length === 1);
    expect(s.world.version).toBe(4); expect(s.world.orders).toHaveLength(0); expect(selectWorkflow(s).metrics.completed).toBe(false);
    const deltas = s.events.filter(e => e.worldVersionAfter !== e.worldVersionBefore).map(e => [e.worldVersionBefore, e.worldVersionAfter]);
    expect(deltas).toEqual([[0, 1], [1, 2], [2, 3], [3, 4]]);
    s = advanceTo(s, s => s.world.orders.length === 1);
    expect(s.world.version).toBe(5); expect(selectWorkflow(s).metrics.completed).toBe(false);
    expect(settle(s).status).toBe('completed');
  });
  it('records delivery separately from consumption and refuses an undelivered prerequisite', () => {
    const s = workflowReducer(createWorkflow(), { type: 'step' });
    expect(s.messages[0].status).toBe('delivered'); expect(s.world.demand).toBeNull(); expect(s.agents.demand.inbox).toEqual([s.messages[0].id]);
    const malformed = structuredClone(s); malformed.messages[0].status = 'queued';
    const result = workflowReducer(malformed, { type: 'step' }); expect(result.status).toBe('failed'); expect(result.world.version).toBe(0);
  });
  it('rejects a wrong sender without executing its payload', () => {
    const s = workflowReducer(createWorkflow(), { type: 'step' }); s.messages[0].from = 'purchase';
    const result = workflowReducer(s, { type: 'step' }); expect(result.status).toBe('failed'); expect(result.world.demand).toBeNull();
  });
});

describe('E04 playback and isolation', () => {
  it('uses logical transitions only, no wall timing, and selectors are detached', () => {
    const initial = createWorkflow();
    let s = workflowReducer(initial, { type: 'start' }); expect(s.transitionCount).toBe(0);
    s = workflowReducer(s, { type: 'pause' });
    for (let n = 0; n < 10; n++) expect(workflowReducer(s, { type: 'timer' })).toEqual(s);
    s = workflowReducer(s, { type: 'step' }); expect(s.transitionCount).toBe(1);
    s = workflowReducer(s, { type: 'start' }); while (selectWorkflow(s).controls.canStep) s = workflowReducer(s, { type: 'timer' });
    expect(canonical(semanticState(s))).toBe(canonical(semanticState(settle(initial))));
    const view = selectWorkflow(s); view.worldSummary.orders.length = 0; expect(s.world.orders).toHaveLength(1);
    expect(workflowReducer(s, { type: 'reset' })).toEqual(initial);
    const configured = workflowReducer(s, { type: 'configure', spec: scenarioSpec('nominal', 'A') }); expect(configured.events).toHaveLength(2); expect(configured.world.orders).toHaveLength(0);
  });
});

describe('E06–07 bounded refresh and concurrent interleaving', () => {
  it('retains stale failure and refreshes through finance, once', () => {
    let s = settle(createWorkflow(scenarioSpec('approval-delay')));
    expect(s.status).toBe('blocked-recoverable'); expect(s.world.orders).toHaveLength(0); expect(s.world.spent).toBe(0);
    const old = s.blockedEventId!;
    const wrong = workflowReducer(s, { type: 'recover', blockedEventId: 'forged' }); expect(wrong.world).toEqual(s.world); expect(wrong.events.at(-1)?.reasonCode).toBe('recovery-unavailable');
    s = workflowReducer(s, { type: 'recover', blockedEventId: old });
    const twice = workflowReducer(s, { type: 'recover', blockedEventId: old }); expect(twice.events.at(-1)?.type).toBe('command-rejected');
    s = settle(twice); expect(s.status).toBe('completed'); expect(s.world.approvals).toHaveLength(2); expect(s.world.approvals[1].expectedWorldVersion).toBe(5);
    expect(s.events.some(e => e.id === old)).toBe(true); expect(s.world.orders).toHaveLength(1); expect(selectWorkflow(s).metrics.recoveryAttempts).toBe(1);
  });
  for (const mode of ['A', 'B', 'C'] as Mode[]) it(`opposite schedule changes winner, retains both proposal outcomes / ${mode}`, () => {
    const s = finish(createWorkflow(scenarioSpec('purchase-race', mode, 'proposal-2-first')));
    expect(s.world.orders[0].proposalId).toBe('proposal-2'); expect(s.world.orders.length).toBe(mode === 'C' ? 1 : 2);
    const results = s.events.filter(e => e.type === 'purchase-decided'); expect(results).toHaveLength(2);
    expect(s.status).toBe('completed'); if (mode === 'C') expect(results[1].reasonCode).toBe('state-version-conflict');
  });
});

describe('E09–10 ambiguous outcomes and read-only reconciliation', () => {
  it('does not confuse committed effect, missing response, and confirmed completion', () => {
    let s = settle(createWorkflow(scenarioSpec('lost-purchase-response')));
    expect(s.status).toBe('outcome-unknown'); expect(s.logicalTime).toBe(5); expect(s.world.orders).toHaveLength(1); expect(selectWorkflow(s).metrics.completed).toBe(false);
    const before = structuredClone(s.world), unknown = s.unknownEventId!;
    s = settle(workflowReducer(s, { type: 'reconcile', unknownEventId: unknown }));
    expect(s.status).toBe('completed'); expect(s.world).toEqual(before); expect(selectWorkflow(s).metrics.reconciliationAttempts).toBe(1);
    expect(s.events.some(e => e.type === 'message-dropped')).toBe(true); expect(s.events.some(e => e.type === 'response-timeout')).toBe(true); expect(s.events.some(e => e.type === 'reconciliation-observed')).toBe(true);
    expect(workflowReducer(s, { type: 'reconcile', unknownEventId: unknown })).toBe(s);
  });
  it('fails explicitly if reviewer fixture has no matching committed order', () => {
    let s = settle(createWorkflow(scenarioSpec('lost-purchase-response'))); s.world.orders = [];
    s = settle(workflowReducer(s, { type: 'reconcile', unknownEventId: s.unknownEventId! })); expect(s.status).toBe('failed'); expect(s.world.orders).toHaveLength(0);
  });
  it('delivers and consumes a response at its exact deadline before timeout', () => {
    let s = advanceTo(createWorkflow(), s => s.queue.some(t => t.kind === 'purchase-response-timeout'));
    const result = s.messages.find(m => m.kind === 'purchase.result')!; result.deliverAt = 5;
    s.queue.find(t => t.messageId === result.id)!.dueAt = 5;
    s.queue.sort((a, b) => a.dueAt - b.dueAt || a.priority - b.priority || a.insertionSequence - b.insertionSequence);
    s = settle(s); expect(s.status).toBe('completed'); expect(s.events.some(e => e.type === 'response-timeout')).toBe(false);
  });
});

describe('E14 dynamic fault boundaries and terminal controls', () => {
  it('journals a valid injection, rejects combined/passed boundaries, and freezes terminal history', () => {
    let s = workflowReducer(createWorkflow(), { type: 'inject', fault: { id: 'manual-delay', kind: 'delay-approval', delay: 60 } });
    expect(s.injectedFaults).toHaveLength(1);
    s = workflowReducer(s, { type: 'inject', fault: { id: 'combo', kind: 'drop-first-purchase-response' } }); expect(s.events.at(-1)?.type).toBe('command-rejected');
    s = finish(s); expect(s.status).toBe('completed');
    for (const type of ['start', 'step', 'timer'] as const) expect(workflowReducer(s, { type })).toBe(s);
  });
  it('exhausts journal at its bound without an unbounded rejection history', () => {
    let s = createWorkflow();
    for (let n = 0; n < 100; n++) s = workflowReducer(s, { type: 'recover', blockedEventId: 'invalid' });
    expect(s.journal).toHaveLength(100); expect(s.status).toBe('ready');
    s = workflowReducer(s, { type: 'recover', blockedEventId: 'invalid' }); expect(s.status).toBe('budget-exhausted');
    const frozen = s; for (let n = 0; n < 100; n++) s = workflowReducer(s, { type: 'recover', blockedEventId: 'invalid' }); expect(s).toBe(frozen);
  });
  it('caps transition and logical-time advancement in reviewer-only fixtures', () => {
    const cap = createWorkflow(); cap.transitionCount = 100;
    expect(workflowReducer(cap, { type: 'step' }).status).toBe('budget-exhausted');
    const late = createWorkflow(); late.queue[0].dueAt = 1001;
    const result = workflowReducer(late, { type: 'step' }); expect(result.status).toBe('budget-exhausted'); expect(result.world.version).toBe(0);
  });
  it('permits transition 100 to finish but rejects 101; includes logical time 1000', () => {
    let s = advanceTo(createWorkflow(), s => s.queue.length === 1 && s.messages.find(m => m.id === s.queue[0].messageId)?.kind === 'task.result' && s.queue[0].kind === 'consume-message');
    expect(s.status).toBe('active'); s.transitionCount = 99; s = workflowReducer(s, { type: 'step' }); expect(s.transitionCount).toBe(100); expect(s.status).toBe('completed');
    const exact = createWorkflow(); exact.queue[0].dueAt = 1000;
    const advanced = workflowReducer(exact, { type: 'step' }); expect(advanced.logicalTime).toBe(1000); expect(advanced.status).toBe('active');
  });
  it('reserves a terminal record and rolls back an audit-overflow transition atomically', () => {
    const s = createWorkflow();
    const event = structuredClone(s.events[0]);
    for (let n = s.events.length; n < 999; n++) s.events.push({ ...event, id: 'reviewer-event-' + n, sequence: n + 1 });
    const before = structuredClone(s.world), ended = workflowReducer(s, { type: 'step' });
    expect(ended.status).toBe('budget-exhausted'); expect(ended.events).toHaveLength(1000); expect(ended.world).toEqual(before);
    expect(workflowReducer(ended, { type: 'step' })).toBe(ended);
  });
  it('does not allocate message 101 or queue entry 101 in a transition', () => {
    const s = workflowReducer(createWorkflow(), { type: 'step' });
    const rootMessage = structuredClone(s.messages[0]);
    for (let n = 1; n < 100; n++) s.messages.push({ ...rootMessage, id: 'reviewer-message-' + n, status: 'consumed' });
    const ended = workflowReducer(s, { type: 'step' }); expect(ended.status).toBe('budget-exhausted'); expect(ended.messages).toHaveLength(100); expect(ended.world.version).toBe(0);
  });
});
