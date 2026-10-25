import { describe, expect, it } from 'vitest';
import { createWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from './index.ts';
import type { Message, WorkflowState } from './types.ts';

function settle(s: WorkflowState): WorkflowState {
  for (let n = 0; n < 110 && selectWorkflow(s).controls.canStep; n++) s = workflowReducer(s, { type: 'step' });
  return s;
}
function finish(s: WorkflowState): WorkflowState {
  s = settle(s);
  if (s.status === 'blocked-recoverable') s = settle(workflowReducer(s, { type: 'recover', blockedEventId: s.blockedEventId! }));
  if (s.status === 'outcome-unknown') s = settle(workflowReducer(s, { type: 'reconcile', unknownEventId: s.unknownEventId! }));
  return s;
}
function confirmation(s: WorkflowState): Extract<Message, { kind: 'task.result' }> {
  const message = s.messages.find(m => m.kind === 'task.result');
  if (!message || message.kind !== 'task.result') throw new Error('Fixture missing confirmation');
  return message;
}
function completion(s: WorkflowState) { return selectWorkflow(s).invariants.find(i => i.id === 'confirmed-completion')!; }

describe('WF-01: completion requires coherent consumed confirmation and commit evidence', () => {
  for (const variant of ['consumed-event', 'message-record', 'delivery-event', 'queued-event', 'commit-event', 'wrong-order', 'wrong-intent', 'wrong-task', 'wrong-context', 'wrong-event-message', 'wrong-parents', 'wrong-created-time', 'missing-agent-consumption', 'message-parent-mismatch', 'dangling-parent', 'forward-parent', 'cross-run-parent'] as const) {
    it(`does not pass with ${variant}, despite retained success flags`, () => {
      const s = finish(createWorkflow()), m = confirmation(s);
      const consumed = s.events.find(e => e.type === 'message-consumed' && e.messageId === m.id)!;
      if (variant === 'consumed-event') s.events = s.events.filter(e => e.id !== consumed.id);
      if (variant === 'message-record') s.messages = s.messages.filter(item => item.id !== m.id);
      if (variant === 'delivery-event') s.events = s.events.filter(e => !(e.type === 'message-delivered' && e.messageId === m.id));
      if (variant === 'queued-event') s.events = s.events.filter(e => !(e.type === 'message-queued' && e.messageId === m.id));
      if (variant === 'commit-event') s.events = s.events.filter(e => e.type !== 'order-committed');
      if (variant === 'wrong-order') m.payload.confirmedOrderIds = ['not-an-order'];
      if (variant === 'wrong-intent') m.payload.orderIntentId = 'other-intent';
      if (variant === 'wrong-task') m.taskId = 'other-task';
      if (variant === 'wrong-context') m.contextId = 'other-context';
      if (variant === 'wrong-event-message') consumed.messageId = 'other-message';
      if (variant === 'wrong-parents') consumed.parentEventIds = [s.events[0].id];
      if (variant === 'wrong-created-time') m.createdAt = m.consumedAt! + 1;
      if (variant === 'missing-agent-consumption') s.agents.orchestrator.consumedMessageIds = [];
      if (variant === 'message-parent-mismatch') m.causedByEventIds = [];
      if (variant === 'dangling-parent') consumed.parentEventIds.push('missing');
      if (variant === 'forward-parent') consumed.parentEventIds.push(s.events[s.events.length - 1].id);
      if (variant === 'cross-run-parent') s.events.find(e => e.type === 'message-queued' && e.messageId === m.id)!.runKey = 'other-run';
      expect(completion(s).status).toBe('fail');
      expect(completion(s).evidenceEventIds).toHaveLength(0);
      expect(selectWorkflow(s).metrics.completed).toBe(false); expect(selectWorkflow(s).metrics.safeCompleted).toBe(false);
    });
  }
  it('keeps nominal, C race winner, refresh recovery and reconciliation confirmed', () => {
    for (const scenario of ['nominal', 'purchase-race', 'approval-delay', 'lost-purchase-response'] as const) {
      const s = finish(createWorkflow(scenarioSpec(scenario)));
      expect(completion(s).status).toBe('pass'); expect(selectWorkflow(s).metrics.safeCompleted).toBe(true);
      const m = confirmation(s);
      for (const e of s.events.filter(e => e.type === 'order-committed')) expect(m.causedByEventIds).toContain(e.id);
    }
  });
});

describe('WF-02: uniqueness is independent of supplied world versions', () => {
  it.each(['equal-version', 'reversed-version', 'reversed-array', 'same-record-reference'] as const)('detects repeated committed intent with %s', variant => {
    const s = finish(createWorkflow()), original = s.world.orders[0], duplicate = structuredClone(original);
    duplicate.id = 'duplicate';
    if (variant === 'reversed-version') duplicate.worldVersion--;
    if (variant === 'same-record-reference') s.world.orders.push(original); else s.world.orders.push(duplicate);
    if (variant === 'reversed-array') s.world.orders.reverse();
    s.world.spent += 400;
    expect(selectWorkflow(s).invariants.find(i => i.id === 'unique-order-intent')?.status).toBe('fail');
    expect(selectWorkflow(s).metrics.unsafeCommittedEffects).toBeGreaterThan(0); expect(selectWorkflow(s).metrics.safeCompleted).toBe(false);
  });
  it('does not count rejected race proposals as effects or double count the ordinary A/B race', () => {
    for (const mode of ['A', 'B', 'C'] as const) {
      const s = finish(createWorkflow(scenarioSpec('purchase-race', mode)));
      expect(selectWorkflow(s).metrics.committedOrders).toBe(mode === 'C' ? 1 : 2);
      expect(selectWorkflow(s).metrics.unsafeCommittedEffects).toBe(mode === 'C' ? 0 : 1);
      expect(selectWorkflow(s).metrics.completed).toBe(true);
    }
  });
});

describe('WF-03: command allocation exhaustion is atomic and bounded', () => {
  for (const operation of ['recover', 'reconcile'] as const) for (const limit of ['message', 'queue'] as const) {
    it(`${operation} returns exhaustion at ${limit} 100 without partial work`, () => {
      const s = settle(createWorkflow(scenarioSpec(operation === 'recover' ? 'approval-delay' : 'lost-purchase-response')));
      if (limit === 'message') {
        while (s.messages.length < 100) s.messages.push({ ...structuredClone(s.messages[0]), id: 'filler-' + s.messages.length, status: 'consumed' });
      } else {
        const next = createWorkflow().queue[0];
        while (s.queue.length < 100) s.queue.push({ ...structuredClone(next), id: 'filler-transition-' + s.queue.length });
      }
      const snapshot = structuredClone(s), oldEvents = s.events.length;
      const command = operation === 'recover' ? { type: 'recover' as const, blockedEventId: s.blockedEventId! } : { type: 'reconcile' as const, unknownEventId: s.unknownEventId! };
      const result = workflowReducer(s, command);
      expect(s).toEqual(snapshot); expect(result.status).toBe('budget-exhausted'); expect(result.running).toBe(false);
      expect(result.world).toEqual(snapshot.world); expect(result.agents).toEqual(snapshot.agents); expect(result.messages).toEqual(snapshot.messages);
      expect(result.events).toHaveLength(oldEvents + 1); expect(result.events.at(-1)?.type).toBe('run-terminal');
      expect(result.journal).toEqual([...snapshot.journal, { atTransition: snapshot.transitionCount, command }]);
      expect(workflowReducer(result, command)).toBe(result);
    });
  }
  it('rolls back partial recovery audit when only one nonterminal event slot remains', () => {
    const s = settle(createWorkflow(scenarioSpec('approval-delay')));
    const copied = structuredClone(s.events[0]);
    while (s.events.length < 998) s.events.push({ ...copied, id: 'filler-event-' + s.events.length, sequence: s.events.length + 1 });
    const before = structuredClone(s), result = workflowReducer(s, { type: 'recover', blockedEventId: s.blockedEventId! });
    expect(result.status).toBe('budget-exhausted'); expect(result.events).toHaveLength(999); expect(result.events.at(-1)?.reasonCode).toBe('event-bound');
    expect(result.world).toEqual(before.world); expect(result.agents).toEqual(before.agents); expect(result.messages).toEqual(before.messages);
    expect(result.events.filter(e => e.type === 'recovery-requested')).toHaveLength(0);
  });
  it.each(['recover', 'reconcile'] as const)('permits allocation 100 for %s from 99 cumulative messages', operation => {
    const s = settle(createWorkflow(scenarioSpec(operation === 'recover' ? 'approval-delay' : 'lost-purchase-response')));
    while (s.messages.length < 99) s.messages.push({ ...structuredClone(s.messages[0]), id: 'filler-' + s.messages.length, status: 'consumed' });
    const result = workflowReducer(s, operation === 'recover' ? { type: 'recover', blockedEventId: s.blockedEventId! } : { type: 'reconcile', unknownEventId: s.unknownEventId! });
    expect(result.messages).toHaveLength(100); expect(result.status).toBe('active'); expect(result.world).toEqual(s.world);
  });
});
