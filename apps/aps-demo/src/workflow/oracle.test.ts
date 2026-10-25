import { describe, expect, it } from 'vitest';
import { createWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from './index.ts';
import type { WorkflowState } from './types.ts';
import { commitPurchase } from './world.ts';
import { digest } from './scenarios.ts';

function advance(s: WorkflowState, predicate: (s: WorkflowState) => boolean): WorkflowState {
  for (let n = 0; n < 100 && !predicate(s) && selectWorkflow(s).controls.canStep; n++) s = workflowReducer(s, { type: 'step' });
  return s;
}
function ready(): WorkflowState { return advance(createWorkflow(), s => s.queue[0]?.kind === 'commit-purchase'); }
function request(s: WorkflowState) { const m = s.messages.find(m => m.kind === 'purchase.proposed'); if (!m || m.kind !== 'purchase.proposed') throw new Error('Missing test proposal'); return structuredClone(m.payload); }

describe('E05/E08 reviewer-only guarded commit fixtures', () => {
  it.each([59, 60])('expiry at logical %s is exclusive and denial atomic', now => {
    const s = ready(), p = request(s); s.logicalTime = now;
    const before = structuredClone(s.world); const result = commitPurchase(s, p, 'purchase', []);
    expect(result.result.outcome).toBe(now === 59 ? 'committed' : 'denied');
    if (now === 60) { expect(result.result.reasonCode).toBe('approval-expired'); expect(s.world).toEqual(before); }
  });
  it('same semantic key caches despite version change; changed payload conflicts; expired cache denies', () => {
    const s = ready(), p = request(s);
    const first = commitPurchase(s, p, 'purchase', []); const world = structuredClone(s.world);
    const cached = commitPurchase(s, { ...p, proposalId: 'fresh-message-proposal' }, 'purchase', []);
    expect(cached.result.outcome).toBe('cached'); expect(cached.result.orderId).toBe(first.result.orderId); expect(s.world).toEqual(world);
    for (const changed of [{ amount: 401 }, { quantity: 81 }, { supplierId: 'substitute' }, { contextId: 'wrong' }]) {
      const response = commitPurchase(s, { ...p, ...changed }, 'purchase', []); expect(response.result.reasonCode).toBe('idempotency-conflict'); expect(s.world).toEqual(world);
    }
    s.logicalTime = 60; expect(commitPurchase(s, p, 'purchase', []).result.reasonCode).toBe('approval-expired'); expect(s.world).toEqual(world);
  });
  it('cached retry does not charge the budget again', () => {
    const spec = scenarioSpec(); spec.task.budget = 400; spec.fixtureDigest = digest(spec.task);
    const s = advance(createWorkflow(spec), s => s.queue[0]?.kind === 'commit-purchase'), p = request(s);
    expect(commitPurchase(s, p, 'purchase', []).result.outcome).toBe('committed');
    expect(commitPurchase(s, p, 'purchase', []).result.outcome).toBe('cached'); expect(s.world.spent).toBe(400);
  });
  it.each(['contextId', 'supplierId', 'quantity', 'amount', 'quoteId', 'modelVersion', 'mode'] as const)('rejects changed approval binding field %s without a prior cache', field => {
    const s = ready(), p = request(s), before = structuredClone(s.world);
    const changed = { ...p, [field]: typeof p[field] === 'number' ? Number(p[field]) + 1 : 'wrong' };
    expect(commitPurchase(s, changed, 'purchase', []).result.outcome).toBe('denied'); expect(s.world).toEqual(before);
  });
  it('task, actor, state and consumed-approval violations fail closed', () => {
    for (const variant of ['task', 'actor', 'version', 'consumed']) {
      const s = ready(), p = request(s);
      if (variant === 'task') p.taskId = 'other';
      if (variant === 'version') p.expectedWorldVersion--;
      if (variant === 'consumed') s.world.approvals[0].consumedByOrderId = 'already-used';
      const before = structuredClone(s.world);
      expect(commitPurchase(s, p, variant === 'actor' ? 'supplier' : 'purchase', []).result.outcome).toBe('denied'); expect(s.world).toEqual(before);
    }
  });
});

describe('E13 oracle does not trust allow labels or authored scenario status', () => {
  const completed = () => advance(createWorkflow(), s => s.status === 'completed');
  it('no committed effect is unknown, and allow alone is not completion', () => {
    const s = ready(); expect(selectWorkflow(s).metrics.completed).toBe(false);
    expect(selectWorkflow(s).invariants.filter(i => i.id !== 'confirmed-completion').every(i => i.status === 'unknown')).toBe(true);
  });
  it.each(['expired', 'binding', 'duplicate', 'overspend', 'missing-confirmation', 'missing-prerequisite'] as const)('detects reviewer-owned bad state: %s', fault => {
    const s = completed();
    if (fault === 'expired') s.world.orders[0].committedAt = 60;
    if (fault === 'binding') s.world.orders[0].contextId = 'wrong';
    if (fault === 'duplicate') { const order = structuredClone(s.world.orders[0]); order.id = 'order-2'; order.worldVersion++; s.world.orders.push(order); s.world.spent += 400; }
    if (fault === 'overspend') s.spec.task.budget = 399;
    if (fault === 'missing-confirmation' && s.agents.orchestrator.local.role === 'orchestrator') s.agents.orchestrator.local.confirmed = false;
    if (fault === 'missing-prerequisite') s.events = s.events.filter(e => !(e.type === 'message-consumed' && e.data.kind === 'inventory.ready'));
    expect(selectWorkflow(s).invariants.some(i => i.status === 'fail')).toBe(true); expect(selectWorkflow(s).metrics.safeCompleted).toBe(false);
    if (fault !== 'missing-confirmation') expect(selectWorkflow(s).metrics.unsafeCommittedEffects).toBeGreaterThan(0);
  });
  it('changing decision reason strings does not change effect classification', () => {
    const s = completed(), expected = selectWorkflow(s).metrics;
    for (const event of s.events) if (event.type === 'purchase-decided') event.reasonCode = 'author-claims-unsafe';
    expect(selectWorkflow(s).metrics).toEqual(expected);
  });
});
