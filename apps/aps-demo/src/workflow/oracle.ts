import type { InvariantObservation, SimOrder, WorkflowMetrics, WorkflowState } from './types.ts';

/** Observes effects and their causal evidence independently of world policy/allow labels. */
function effectProblems(s: WorkflowState, order: SimOrder, effectIndex: number): string[] {
  const problems: string[] = [], approval = s.world.approvals.find(a => a.id === order.approvalId);
  const event = s.events.find(e => e.type === 'order-committed' && e.data.orderId === order.id);
  const parentIds = new Set<string>();
  const visit = (id: string) => {
    if (parentIds.has(id)) return;
    parentIds.add(id); const parent = s.events.find(e => e.id === id); if (parent) parent.parentEventIds.forEach(visit);
  };
  event?.parentEventIds.forEach(visit);
  const consumedKinds = new Set<string>(s.events.filter(e => e.type === 'message-consumed' && parentIds.has(e.id)).map(e => e.type === 'message-consumed' ? e.data.kind : ''));
  if (!event || !['task.assigned', 'demand.ready', 'inventory.ready', 'quote.ready', 'approval.ready', 'purchase.proposed'].every(kind => consumedKinds.has(kind))) problems.push('prerequisite-evidence');
  if (!approval || order.committedAt < approval.issuedAt || order.committedAt >= approval.expiresAt) problems.push('approval-freshness');
  if (!approval || ['taskId', 'contextId', 'supplierId', 'quantity', 'amount', 'quoteId', 'modelVersion', 'mode'].some(key => order[key as keyof SimOrder] !== approval[key as keyof typeof approval])
    || order.taskId !== s.spec.task.id || order.contextId !== s.spec.task.contextId || order.quantity !== Math.max(0, s.spec.task.demand - s.spec.task.stock) || order.amount !== order.quantity * s.spec.task.unitPrice) problems.push('approval-binding');
  if (!approval || order.worldVersion !== approval.expectedWorldVersion + 1 || approval.consumedByOrderId !== order.id) problems.push('approval-consumption-version');
  // Committed-effect order, not a possibly corrupt version field, identifies repeats.
  if (s.world.orders.slice(0, effectIndex).some(other => other.orderIntentId === order.orderIntentId)) problems.push('unique-order-intent');
  const cumulative = s.world.orders.filter(other => other.worldVersion <= order.worldVersion).reduce((sum, item) => sum + item.amount, 0);
  if (cumulative > s.spec.task.budget) problems.push('spend-budget');
  return problems;
}
/** A confirmation must be backed by consumed message evidence and actual commit ancestry. */
function confirmationEvidence(s: WorkflowState): string[] {
  const p = s.agents.purchase.local;
  if (p.role !== 'purchase' || !s.world.orders.length || s.world.orders.some(order => order.orderIntentId !== p.intentId)) return [];
  const actualIds = s.world.orders.map(order => order.id);
  if (new Set(actualIds).size !== actualIds.length) return [];
  const positions = new Map(s.events.map((event, index) => [event.id, index]));
  if (positions.size !== s.events.length) return [];
  const ancestry = (id: string, ceiling: number, seen: Set<string>): boolean => {
    const index = positions.get(id);
    if (index === undefined || index >= ceiling) return false;
    const event = s.events[index];
    if (event.runKey !== s.runKey || (event.type !== 'run-created' && !event.parentEventIds.length)) return false;
    if (seen.has(id)) return true;
    seen.add(id);
    return event.parentEventIds.every(parent => ancestry(parent, index, seen));
  };
  return s.events.filter(event => {
    if (event.type !== 'message-consumed' || event.data.kind !== 'task.result' || event.actor !== 'orchestrator') return false;
    const message = s.messages.find(m => m.id === event.messageId);
    if (!message || message.kind !== 'task.result' || message.status !== 'consumed' || message.from !== 'purchase' || message.to !== 'orchestrator'
      || message.taskId !== s.spec.task.id || message.contextId !== s.spec.task.contextId || message.payload.outcome !== 'confirmed' || message.payload.orderIntentId !== p.intentId
      || !s.agents.orchestrator.consumedMessageIds.includes(message.id) || message.consumedAt !== event.logicalTime || message.deliveredAt === undefined
      || message.createdAt > message.deliveredAt || message.deliveredAt > message.consumedAt) return false;
    const ids = message.payload.confirmedOrderIds;
    if (new Set(ids).size !== ids.length || ids.length !== actualIds.length || actualIds.some(id => !ids.includes(id))) return false;
    const ancestors = new Set<string>();
    if (!ancestry(event.id, s.events.length, ancestors)) return false;
    const delivered = s.events.find(e => event.parentEventIds.includes(e.id) && e.type === 'message-delivered' && e.messageId === message.id
      && e.actor === 'orchestrator' && e.data.kind === 'task.result' && e.data.from === 'purchase' && e.logicalTime === message.deliveredAt);
    if (!delivered) return false;
    const queued = s.events.find(e => delivered.parentEventIds.includes(e.id) && e.type === 'message-queued' && e.messageId === message.id
      && e.actor === 'purchase' && e.data.kind === 'task.result' && e.data.to === 'orchestrator' && e.logicalTime === message.createdAt);
    if (!queued || !message.causedByEventIds.length || message.causedByEventIds.length !== queued.parentEventIds.length || message.causedByEventIds.some(id => !queued.parentEventIds.includes(id))) return false;
    return s.world.orders.every(order => s.events.some(e => ancestors.has(e.id) && e.type === 'order-committed' && e.data.orderId === order.id
      && e.data.proposalId === order.proposalId && e.logicalTime === order.committedAt && e.worldVersionAfter === order.worldVersion));
  }).map(event => event.id);
}
export function observeInvariants(s: WorkflowState): InvariantObservation[] {
  const checked = s.world.orders.map((order, index) => ({ order, problems: effectProblems(s, order, index) }));
  const ids = ['prerequisite-evidence', 'approval-freshness', 'approval-binding', 'approval-consumption-version', 'unique-order-intent', 'spend-budget'];
  const observations: InvariantObservation[] = ids.map(id => {
    const failed = checked.filter(row => row.problems.includes(id));
    return { id, status: failed.length ? 'fail' : checked.length ? 'pass' : 'unknown', evidenceEventIds: s.events.filter(e => e.type === 'order-committed' && (failed.length ? failed.some(row => e.data.orderId === row.order.id) : true)).map(e => e.id), explanationCode: failed.length ? id + '-violated' : checked.length ? id + '-observed' : 'no-committed-effects' };
  });
  if (s.world.spent !== s.world.orders.reduce((sum, order) => sum + order.amount, 0)) {
    const budget = observations.find(o => o.id === 'spend-budget')!; budget.status = 'fail'; budget.explanationCode = 'spend-ledger-mismatch';
  }
  const o = s.agents.orchestrator.local, p = s.agents.purchase.local;
  const evidence = confirmationEvidence(s);
  const confirmed = o.role === 'orchestrator' && o.confirmed && p.role === 'purchase' && p.outcome === 'confirmed' && !p.pendingProposalIds.length && evidence.length > 0 && !s.queue.length;
  observations.push({ id: 'confirmed-completion', status: s.status === 'completed' ? confirmed ? 'pass' : 'fail' : 'unknown', evidenceEventIds: evidence, explanationCode: s.status === 'completed' && confirmed ? 'confirmed-workflow' : 'not-confirmed-complete' });
  return observations;
}
export function workflowMetrics(s: WorkflowState): WorkflowMetrics {
  const o = s.agents.orchestrator.local;
  const completion = observeInvariants(s).find(item => item.id === 'confirmed-completion');
  const unsafe = s.world.orders.filter((order, index) => effectProblems(s, order, index).length > 0).length;
  const completed = s.status === 'completed' && completion?.status === 'pass';
  return { committedOrders: s.world.orders.length, spent: s.world.spent, unsafeCommittedEffects: unsafe,
    deniedProposals: s.events.filter(e => e.type === 'purchase-decided' && e.data.outcome === 'denied').length,
    cachedResults: s.events.filter(e => e.type === 'purchase-decided' && e.data.outcome === 'cached').length,
    recoveryAttempts: o.role === 'orchestrator' ? o.refreshAttempts : 0, reconciliationAttempts: o.role === 'orchestrator' ? o.reconciliationAttempts : 0,
    completed, safeCompleted: completed && unsafe === 0 && observeInvariants(s).every(i => i.status === 'pass'), pendingMessages: s.messages.filter(m => m.status === 'queued' || m.status === 'delivered').length };
}
