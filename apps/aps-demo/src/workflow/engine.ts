import { initialAgents, react } from './agents.ts';
import type { Effect } from './agents.ts';
import { canonical, digest, scenarioSpec } from './scenarios.ts';
import { allocate, canAdvance, isTerminal, schedule, QueueBudget } from './scheduler.ts';
import { issueApproval, commitPurchase } from './world.ts';
import { validateSpec } from './validation.ts';
import { MAX_EVENTS, MAX_JOURNAL } from './types.ts';
import type { AgentId, DraftMessage, EventDataMap, EventType, FaultSpec, Message, RunSpec, RunStatus, WorkflowCommand, WorkflowEvent, WorkflowState } from './types.ts';

class EventBudget extends Error {}
function emit<K extends EventType>(s: WorkflowState, type: K, actor: AgentId, parents: string[], data: EventDataMap[K], options: { messageId?: string; before?: number; reasonCode?: string; beforeStatus?: WorkflowState['agents'][AgentId]['status'] } = {}): string {
  if (s.events.length >= MAX_EVENTS - 1 && type !== 'run-terminal') throw new EventBudget('Reserve terminal record');
  if (s.events.length >= MAX_EVENTS) throw new Error('Internal invariant: event budget');
  const id = allocate(s, 'evt');
  s.events.push({ id, runKey: s.runKey, sequence: s.events.length + 1, logicalTime: s.logicalTime, transitionId: s.currentTransitionId,
    type, actor, parentEventIds: [...parents], worldVersionBefore: options.before ?? s.world.version, worldVersionAfter: s.world.version,
    ...(options.messageId ? { messageId: options.messageId } : {}), ...(options.reasonCode ? { reasonCode: options.reasonCode } : {}),
    ...(options.beforeStatus ? { agentStatusBefore: options.beforeStatus, agentStatusAfter: s.agents[actor].status } : {}), data } as WorkflowEvent);
  s.agents[actor].lastEventId = id;
  return id;
}
function terminal(s: WorkflowState, status: RunStatus, reason: string, parents: string[]): void {
  if (isTerminal(s)) return;
  const canceled = s.queue.map(t => t.id);
  s.queue = []; s.running = false; s.status = status;
  const lastAgentEvent = s.agents.orchestrator.lastEventId;
  emit(s, 'run-terminal', 'orchestrator', parents, { status, canceledTransitionIds: canceled }, { reasonCode: reason });
  // Run-level termination is audited without inventing another agent transition.
  s.agents.orchestrator.lastEventId = lastAgentEvent;
}
function faultFor(s: WorkflowState, kind: FaultSpec['kind']): FaultSpec | undefined {
  return [...s.spec.faults, ...s.injectedFaults].find(f => f.kind === kind && !s.consumedFaultIds.includes(f.id));
}
function send(s: WorkflowState, draft: DraftMessage, parents: string[]): void {
  if (s.messages.length >= s.spec.limits.maxMessages) throw new QueueBudget('message-bound');
  let deliverAt = s.logicalTime;
  const delay = draft.kind === 'approval.ready' ? faultFor(s, 'delay-approval') : undefined;
  if (delay?.kind === 'delay-approval') { deliverAt += delay.delay; s.consumedFaultIds.push(delay.id); }
  const message = { ...structuredClone(draft), id: allocate(s, 'msg'), taskId: s.spec.task.id, contextId: s.spec.task.contextId,
    causedByEventIds: [...parents], createdAt: s.logicalTime, deliverAt, attempt: draft.kind === 'approval.ready' ? s.world.approvals.length : 1, status: 'queued' } as Message;
  s.messages.push(message);
  const event = emit(s, 'message-queued', draft.from, parents, { kind: message.kind, to: message.to }, { messageId: message.id });
  schedule(s, 'deliver-message', message.id, deliverAt, [event]);
}
function confirmToOrchestrator(s: WorkflowState, parents: string[]): void {
  const p = s.agents.purchase.local;
  if (p.role !== 'purchase' || p.pendingProposalIds.length || p.outcome !== 'confirmed') return;
  if (s.messages.some(m => m.kind === 'task.result')) return;
  const orders = s.world.orders.filter(o => o.orderIntentId === p.intentId);
  const committed = s.events.filter(e => e.type === 'order-committed' && orders.some(order => e.data.orderId === order.id)).map(e => e.id);
  send(s, { from: 'purchase', to: 'orchestrator', kind: 'task.result', payload: { orderIntentId: p.intentId, confirmedOrderIds: orders.map(o => o.id), outcome: 'confirmed' } }, [...new Set([...parents, ...committed])]);
}
function effect(s: WorkflowState, e: Effect, message: Message, parents: string[]): void {
  switch (e.type) {
    case 'send': send(s, e.message, parents); return;
    case 'consume-fault': s.consumedFaultIds.push(e.faultId); return;
    case 'demand': s.world.demand = e.forecast; s.world.version++; return;
    case 'inventory': s.world.quantity = e.quantity; s.world.version++; return;
    case 'quote': s.world.quote = e.quote; s.world.version++; return;
    case 'approval': {
      const before = s.world.version;
      const approval = issueApproval(s);
      if (!approval) { terminal(s, 'failed', 'finance-budget-or-prerequisite', parents); return; }
      const local = s.agents.finance.local;
      if (local.role === 'finance') local.approvalIds.push(approval.id);
      const event = emit(s, 'approval-issued', 'finance', parents, { approvalId: approval.id, expiresAt: approval.expiresAt }, { before });
      send(s, { kind: 'approval.ready', from: 'finance', to: 'purchase', payload: approval }, [event]); return;
    }
    case 'schedule-commit': schedule(s, 'commit-purchase', e.messageId, s.logicalTime, parents); return;
    case 'purchase-response': {
      const result = e.message.payload;
      s.queue = s.queue.filter(t => !(t.kind === 'purchase-response-timeout' && s.messages.find(m => m.id === t.messageId && m.kind === 'purchase.proposed' && m.payload.proposalId === result.proposalId)));
      const p = s.agents.purchase.local;
      if (result.outcome === 'denied' && p.role === 'purchase' && !p.pendingProposalIds.length && p.outcome !== 'confirmed') {
        if (result.reasonCode === 'approval-expired') { s.status = 'blocked-recoverable'; s.running = false; s.blockedEventId = parents[0]; }
        else terminal(s, 'failed', result.reasonCode, parents);
      } else confirmToOrchestrator(s, parents);
      return;
    }
    case 'query-order': {
      const payload = e.message.payload;
      const found = s.world.orders.find(o => o.orderIntentId === payload.orderIntentId && o.idempotencyKey === payload.idempotencyKey) ?? null;
      const event = emit(s, 'reconciliation-observed', 'orchestrator', parents, { orderId: found?.id ?? null });
      send(s, { from: 'orchestrator', to: 'purchase', kind: 'reconciliation.result', payload: { order: found ? structuredClone(found) : null, observedWorldVersion: s.world.version, requestMessageId: message.id } }, [event]); return;
    }
    case 'reconciled':
      if (e.message.payload.order) confirmToOrchestrator(s, parents);
      else terminal(s, 'failed', 'reconciliation-order-absent', parents);
      return;
    case 'confirmed':
      if (!e.confirmed) terminal(s, 'failed', 'unconfirmed-task-result', parents);
      return;
  }
}
function finishIfReady(s: WorkflowState, parents: string[]): void {
  if (isTerminal(s) || s.status === 'blocked-recoverable' || s.status === 'outcome-unknown') return;
  const o = s.agents.orchestrator.local, p = s.agents.purchase.local;
  if (o.role === 'orchestrator' && o.confirmed && p.role === 'purchase' && !p.pendingProposalIds.length && !s.queue.length) terminal(s, 'completed', 'confirmed-workflow', parents);
  else if (!s.queue.length) terminal(s, 'failed', 'unresolved-workflow', parents);
}
export function createWorkflow(spec: RunSpec = scenarioSpec()): WorkflowState {
  const error = validateSpec(spec);
  if (error) throw new Error('Invalid run specification: ' + error);
  const s: WorkflowState = { spec: structuredClone(spec), runKey: digest(spec), status: 'ready', running: false, logicalTime: 0, transitionCount: 0,
    agents: initialAgents(spec.task.id), messages: [], queue: [], world: { version: 0, taskId: spec.task.id, contextId: spec.task.contextId, demand: null, stock: spec.task.stock, quantity: null, quote: null, approvals: [], orders: [], spent: 0, idempotentResults: [] },
    events: [], journal: [], consumedFaultIds: [], injectedFaults: [], nextId: 1, currentTransitionId: 'initial', blockedEventId: null, unknownEventId: null };
  const root = emit(s, 'run-created', 'orchestrator', [], { simulationOnly: true, scenario: spec.scenario });
  send(s, { from: 'orchestrator', to: 'demand', kind: 'task.assigned', payload: spec.task }, [root]);
  return s;
}
function advance(s: WorkflowState): void {
  const next = s.queue[0];
  if (!next) return;
  if (s.transitionCount >= s.spec.limits.maxTransitions || s.messages.length > s.spec.limits.maxMessages || s.queue.length > 100 || next.dueAt > s.spec.limits.maxLogicalTime) {
    terminal(s, 'budget-exhausted', 'execution-bound', s.events.length ? [s.events[s.events.length - 1].id] : []); return;
  }
  s.queue.shift(); s.currentTransitionId = next.id; s.logicalTime = next.dueAt; s.transitionCount++; s.status = 'active';
  const message = s.messages.find(m => m.id === next.messageId);
  if (!message) { terminal(s, 'failed', 'missing-queued-message', next.causedByEventIds); return; }
  const agent = s.agents[message.to];
  let lastParents = next.causedByEventIds;
  if (next.kind === 'deliver-message') {
    const drop = message.kind === 'purchase.result' && message.payload.outcome === 'committed' ? faultFor(s, 'drop-first-purchase-response') : undefined;
    if (drop) {
      s.consumedFaultIds.push(drop.id); message.status = 'dropped';
      lastParents = [emit(s, 'message-dropped', message.from, lastParents, { kind: message.kind, faultId: drop.id }, { messageId: message.id })];
    } else if (message.status === 'queued') {
      message.status = 'delivered'; message.deliveredAt = s.logicalTime; agent.inbox.push(message.id); agent.status = 'ready';
      lastParents = [emit(s, 'message-delivered', message.to, lastParents, { kind: message.kind, from: message.from }, { messageId: message.id })];
      schedule(s, 'consume-message', message.id, s.logicalTime, lastParents);
    }
  } else if (next.kind === 'consume-message') {
    if (message.status !== 'delivered' || !agent.inbox.includes(message.id)) { terminal(s, 'failed', 'undelivered-message', lastParents); return; }
    const reaction = react(s, message);
    if (reaction.rejection) { message.status = 'rejected'; agent.inbox = agent.inbox.filter(id => id !== message.id); terminal(s, 'failed', reaction.rejection, lastParents); return; }
    const before = s.world.version, beforeStatus = agent.status;
    message.status = 'consumed'; message.consumedAt = s.logicalTime; agent.inbox = agent.inbox.filter(id => id !== message.id); agent.consumedMessageIds.push(message.id);
    const consumed = emit(s, 'message-consumed', message.to, lastParents, { kind: message.kind, from: message.from }, { messageId: message.id });
    agent.local = reaction.local; agent.status = reaction.status;
    // Persist simple derived world outputs before recording the transition's version delta.
    for (const e of reaction.effects.filter(e => ['demand', 'inventory', 'quote'].includes(e.type))) effect(s, e, message, [consumed]);
    const transition = emit(s, 'agent-transition', message.to, [consumed], { role: message.to }, { before, beforeStatus, messageId: message.id });
    lastParents = [transition];
    for (const e of reaction.effects.filter(e => !['demand', 'inventory', 'quote'].includes(e.type))) {
      effect(s, e, message, lastParents); if (isTerminal(s)) break;
    }
  } else if (next.kind === 'commit-purchase') {
    if (message.kind !== 'purchase.proposed' || message.status !== 'consumed') { terminal(s, 'failed', 'unconsumed-purchase-proposal', lastParents); return; }
    const before = s.world.version;
    const committed = commitPurchase(s, message.payload, message.from, lastParents);
    const decision = emit(s, 'purchase-decided', 'orchestrator', lastParents, committed.result, { before, messageId: message.id, reasonCode: committed.result.reasonCode });
    lastParents = [decision];
    if (committed.order) {
      const orderEvent = emit(s, 'order-committed', 'orchestrator', lastParents, { orderId: committed.order.id, proposalId: message.payload.proposalId }, { before, messageId: message.id });
      lastParents = [orderEvent];
    }
    send(s, { from: 'orchestrator', to: 'purchase', kind: 'purchase.result', payload: committed.result }, lastParents);
    if (!isTerminal(s)) schedule(s, 'purchase-response-timeout', message.id, s.logicalTime + 5, lastParents);
  } else if (next.kind === 'purchase-response-timeout') {
    const p = s.agents.purchase.local;
    if (message.kind === 'purchase.proposed' && p.role === 'purchase' && p.pendingProposalIds.includes(message.payload.proposalId)) {
      p.outcome = 'unknown'; s.agents.purchase.status = 'unknown'; s.status = 'outcome-unknown'; s.running = false;
      const dropped = s.messages.find(m => m.kind === 'purchase.result' && m.payload.proposalId === message.payload.proposalId && m.status === 'dropped');
      const dropEvent = dropped ? s.events.find(e => e.type === 'message-dropped' && e.messageId === dropped.id) : undefined;
      lastParents = [emit(s, 'response-timeout', 'purchase', dropEvent ? [...lastParents, dropEvent.id] : lastParents, { proposalId: message.payload.proposalId })];
      s.unknownEventId = lastParents[0];
    }
  }
  if (!isTerminal(s) && (s.messages.length > 100 || s.queue.length > 100)) terminal(s, 'budget-exhausted', 'execution-bound', lastParents);
  finishIfReady(s, lastParents);
}
function boundedMutation(s: WorkflowState, operation: () => void): WorkflowState {
  const before = structuredClone(s);
  try { operation(); return s; }
  catch (error) {
    if (!(error instanceof EventBudget) && !(error instanceof QueueBudget)) throw error;
    // A transition and all its audit records are atomic; never retain an unaudited effect.
    terminal(before, 'budget-exhausted', error instanceof EventBudget ? 'event-bound' : error.message, [before.events[before.events.length - 1].id]);
    return before;
  }
}
function boundedAdvance(s: WorkflowState): WorkflowState { return boundedMutation(s, () => advance(s)); }
function journal(s: WorkflowState, command: Extract<WorkflowCommand, { type: 'recover' | 'reconcile' | 'inject' }>): boolean {
  if (s.journal.length >= MAX_JOURNAL) { terminal(s, 'budget-exhausted', 'journal-bound', [s.events[s.events.length - 1].id]); return false; }
  s.journal.push({ atTransition: s.transitionCount, command: structuredClone(command) }); return true;
}
function reject(s: WorkflowState, command: WorkflowCommand, reason: string): void {
  emit(s, 'command-rejected', 'orchestrator', [s.events[s.events.length - 1].id], { command: command.type }, { reasonCode: reason });
}
export function availableFaultKinds(s: WorkflowState): FaultSpec['kind'][] {
  if (isTerminal(s) || s.status === 'blocked-recoverable' || s.status === 'outcome-unknown') return [];
  if (s.spec.faults.length || s.injectedFaults.length) return [];
  const kinds: FaultSpec['kind'][] = ['delay-approval', 'duplicate-purchase-proposal', 'drop-first-purchase-response'];
  return kinds.filter(kind => {
    if ([...s.spec.faults, ...s.injectedFaults].some(f => f.kind === kind)) return false;
    const boundary = kind === 'delay-approval' ? 'approval.ready' : kind === 'duplicate-purchase-proposal' ? 'purchase.proposed' : 'purchase.result';
    return !s.messages.some(m => m.kind === boundary);
  });
}
export function workflowReducer(state: WorkflowState, command: WorkflowCommand): WorkflowState {
  if (command.type === 'reset') return createWorkflow(state.spec);
  if (command.type === 'configure') return createWorkflow(command.spec);
  if (isTerminal(state)) return state;
  if (command.type === 'timer' && !state.running) return state;
  const s = structuredClone(state); s.currentTransitionId = 'command-' + s.transitionCount + '-' + s.journal.length;
  if (s.events.length >= MAX_EVENTS - 1) { terminal(s, 'budget-exhausted', 'event-bound', [s.events[s.events.length - 1].id]); return s; }
  switch (command.type) {
    case 'pause': s.running = false; return s;
    case 'start': if (canAdvance(s)) { s.running = true; if (s.status === 'ready') s.status = 'active'; } return s;
    case 'step': s.running = false; return canAdvance(s) ? boundedAdvance(s) : s;
    case 'timer': return canAdvance(s) ? boundedAdvance(s) : s;
    case 'recover': {
      if (!journal(s, command)) return s;
      return boundedMutation(s, () => {
      const o = s.agents.orchestrator.local;
      if (s.status !== 'blocked-recoverable' || command.blockedEventId !== s.blockedEventId || o.role !== 'orchestrator' || o.refreshAttempts >= 1 || !s.world.quote) { reject(s, command, 'recovery-unavailable'); return; }
      o.refreshAttempts++; o.phase = 'refreshing'; s.status = 'active'; s.blockedEventId = null;
      const event = emit(s, 'recovery-requested', 'orchestrator', [command.blockedEventId], { blockedEventId: command.blockedEventId });
      send(s, { from: 'orchestrator', to: 'finance', kind: 'recovery.requested', payload: { blockedEventId: command.blockedEventId, quoteId: s.world.quote.id, orderIntentId: 'intent-' + s.spec.task.id, refreshAttempt: 1 } }, [event]);
      });
    }
    case 'reconcile': {
      if (!journal(s, command)) return s;
      return boundedMutation(s, () => {
      const o = s.agents.orchestrator.local, p = s.agents.purchase.local;
      if (s.status !== 'outcome-unknown' || command.unknownEventId !== s.unknownEventId || o.role !== 'orchestrator' || p.role !== 'purchase' || o.reconciliationAttempts >= 1) { reject(s, command, 'reconciliation-unavailable'); return; }
      const request = s.messages.find(m => m.kind === 'purchase.proposed' && p.pendingProposalIds.includes(m.payload.proposalId));
      if (!request || request.kind !== 'purchase.proposed') { reject(s, command, 'missing-unknown-request'); return; }
      o.reconciliationAttempts++; s.status = 'active'; s.unknownEventId = null;
      send(s, { from: 'purchase', to: 'orchestrator', kind: 'reconciliation.requested', payload: { proposalId: request.payload.proposalId, orderIntentId: request.payload.orderIntentId, idempotencyKey: request.payload.idempotencyKey, unknownEventId: command.unknownEventId } }, [command.unknownEventId]);
      });
    }
    case 'inject': {
      if (!journal(s, command)) return s;
      const f = command.fault;
      if (!f || !availableFaultKinds(s).includes(f.kind) || !/^[a-zA-Z0-9_-]{1,128}$/.test(f.id) || [...s.spec.faults, ...s.injectedFaults].some(item => item.id === f.id)
        || (f.kind === 'delay-approval' && f.delay !== 60) || canonical(Object.keys(f).sort()) !== canonical((f.kind === 'delay-approval' ? ['id', 'kind', 'delay'] : ['id', 'kind']).sort())) { reject(s, command, 'fault-boundary-or-spec-invalid'); return s; }
      s.injectedFaults.push(structuredClone(f)); return s;
    }
  }
}
