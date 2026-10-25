import { describe, expect, it } from 'vitest';
import { createWorkflow, workflowReducer, selectWorkflow, scenarioSpec, SIMULATION_LABEL } from './index.ts';
import { react } from './agents.ts';
import { digest } from './scenarios.ts';
import type { WorkflowState } from './types.ts';

function beforeConsume(kind: string): WorkflowState {
  let s = createWorkflow();
  for (let n = 0; n < 100; n++) {
    const next = s.queue[0], m = s.messages.find(m => m.id === next?.messageId);
    if (next?.kind === 'consume-message' && m?.kind === kind) return s;
    s = workflowReducer(s, { type: 'step' });
  }
  throw new Error('Test boundary not reached');
}
describe('E02/E15 generated agent protocol and simulation envelope', () => {
  it.each(['task.assigned', 'demand.ready', 'inventory.ready', 'quote.ready', 'approval.ready', 'purchase.proposed'])('rejects unknown payload fields at %s', kind => {
    const s = beforeConsume(kind), m = s.messages.find(m => m.id === s.queue[0].messageId)!;
    Object.assign(m.payload, { unexpectedAuthority: 'approve-everything' });
    const before = structuredClone(s.world), result = workflowReducer(s, { type: 'step' });
    expect(result.status).toBe('failed'); expect(result.world).toEqual(before); expect(result.events.at(-1)?.reasonCode).toBe('invalid-message-payload');
  });
  it('refuses a duplicate delivery ID in the worker reaction', () => {
    const s = beforeConsume('demand.ready'), m = s.messages.find(m => m.id === s.queue[0].messageId)!;
    s.agents.inventory.consumedMessageIds.push(m.id); expect(react(s, m).rejection).toBe('duplicate-message');
  });
  it('refuses nonnumeric payloads and wrong task/context independently of mode', () => {
    const s = beforeConsume('demand.ready'), m = s.messages.find(m => m.id === s.queue[0].messageId)!;
    Object.assign(m.payload, { forecast: '100' }); expect(react(s, m).rejection).toBe('invalid-message-payload');
    m.taskId = 'other'; expect(react(s, m).rejection).toBe('invalid-message-route');
  });
  it('derives a different valid task rather than replaying a canned transcript', () => {
    const spec = scenarioSpec(); spec.task.demand = 50; spec.task.stock = 10; spec.task.unitPrice = 7; spec.fixtureDigest = digest(spec.task);
    let s = createWorkflow(spec); while (selectWorkflow(s).controls.canStep) s = workflowReducer(s, { type: 'step' });
    expect(s.world.quantity).toBe(40); expect(s.world.quote?.amount).toBe(280); expect(s.world.spent).toBe(280);
    expect(s.world.orders[0].quantity).toBe(40); expect(s.messages.some(m => m.kind === 'inventory.ready' && m.payload.quantity === 40)).toBe(true);
  });
  it('handles no replenishment explicitly, not with a fabricated order', () => {
    const spec = scenarioSpec(); spec.task.demand = 0; spec.fixtureDigest = digest(spec.task);
    let s = createWorkflow(spec); while (selectWorkflow(s).controls.canStep) s = workflowReducer(s, { type: 'step' });
    expect(s.status).toBe('failed'); expect(s.world.orders).toHaveLength(0); expect(selectWorkflow(s).metrics.completed).toBe(false);
  });
  it('does not expose arbitrary world/control commands and carries persistent limitations', () => {
    const view = selectWorkflow(createWorkflow()); expect(view.label).toBe(SIMULATION_LABEL);
    expect(view.limitations.join(' ')).toContain('no live models'); expect(view.limitations.join(' ')).toContain('objective arbitration');
    expect(view.limitations.join(' ')).toContain('Seed is replay metadata');
  });
});
