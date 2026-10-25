import { digest } from './scenarios.ts';
import type { Binding, Proposal, PurchaseResult, SimApproval, SimOrder, WorkflowState } from './types.ts';

export function bindingFor(state: WorkflowState): Binding {
  const quote = state.world.quote;
  if (!quote) throw new Error('Internal invariant: missing quote');
  return { taskId: state.world.taskId, contextId: state.world.contextId, supplierId: quote.supplierId, quantity: quote.quantity,
    amount: quote.amount, quoteId: quote.id, modelVersion: state.spec.modelVersion, mode: state.spec.mode };
}
export function issueApproval(state: WorkflowState): SimApproval | null {
  const w = state.world;
  if (!w.quote || w.quantity === null || w.demand === null || (state.spec.mode !== 'A' && w.quote.amount > state.spec.task.budget)) return null;
  const approval: SimApproval = { ...bindingFor(state), id: 'approval-' + (w.approvals.length + 1), issuedAt: state.logicalTime,
    expiresAt: state.logicalTime + state.spec.task.approvalTtl, expectedWorldVersion: w.version + 1, consumedByOrderId: null };
  w.version++; w.approvals.push(approval);
  return approval;
}
export function proposalFingerprint(proposal: Proposal): string {
  const { proposalId: _id, ...semantic } = proposal;
  void _id;
  return digest(semantic);
}
/** An atomic, in-memory simulated commit. No tool/service is called. */
export function commitPurchase(state: WorkflowState, proposal: Proposal, actor: string, parents: string[]): { result: PurchaseResult; order: SimOrder | null } {
  const w = state.world;
  const result = (outcome: PurchaseResult['outcome'], reasonCode: string, orderId: string | null = null): PurchaseResult => ({ proposalId: proposal.proposalId, outcome, reasonCode, orderId, observedWorldVersion: w.version });
  const deny = (reason: string) => ({ result: result('denied', reason), order: null });
  if (!w.quote || w.demand === null || w.quantity === null || !w.approvals.length) return deny('missing-prerequisite');
  if (proposal.taskId !== w.taskId || !Number.isSafeInteger(proposal.amount) || proposal.amount <= 0 || !Number.isSafeInteger(proposal.quantity) || proposal.quantity <= 0) return deny('invalid-protocol');
  if (state.spec.mode !== 'A' && actor !== 'purchase') return deny('actor-tool-scope');
  const cached = state.spec.mode === 'C' ? w.idempotentResults.find(entry => entry.key === proposal.idempotencyKey) : undefined;
  if (cached && cached.semanticFingerprint !== proposalFingerprint(proposal)) return deny('idempotency-conflict');
  if (state.spec.mode !== 'A' && w.spent + (cached ? 0 : proposal.amount) > state.spec.task.budget) return deny('budget-exceeded');
  const approval = w.approvals.find(a => a.id === proposal.approvalId);
  if (state.spec.mode === 'C') {
    if (!approval) return deny('approval-missing');
    const expected = bindingFor(state);
    if (Object.entries(expected).some(([key, value]) => proposal[key as keyof Binding] !== value || approval[key as keyof Binding] !== value)) return deny('approval-binding');
    if (state.logicalTime >= approval.expiresAt) return deny('approval-expired');
    if (cached) return { result: result('cached', 'idempotent-result', cached.orderId), order: null };
    if (proposal.expectedWorldVersion !== w.version || approval.expectedWorldVersion !== w.version) return deny('state-version-conflict');
    if (approval.consumedByOrderId) return deny('approval-consumed');
  }
  const order: SimOrder = { taskId: proposal.taskId, contextId: proposal.contextId, supplierId: proposal.supplierId, quantity: proposal.quantity, amount: proposal.amount,
    quoteId: proposal.quoteId, modelVersion: proposal.modelVersion, mode: proposal.mode, id: 'order-' + (w.orders.length + 1), label: 'SIMULATED', orderIntentId: proposal.orderIntentId,
    proposalId: proposal.proposalId, idempotencyKey: proposal.idempotencyKey, approvalId: proposal.approvalId, committedAt: state.logicalTime, worldVersion: w.version + 1, causedByEventIds: [...parents] };
  w.orders.push(order); w.spent += order.amount; w.version++;
  if (approval && !approval.consumedByOrderId) approval.consumedByOrderId = order.id;
  w.idempotentResults.push({ key: proposal.idempotencyKey, semanticFingerprint: proposalFingerprint(proposal), orderId: order.id });
  return { result: result('committed', 'simulated-commit', order.id), order };
}
