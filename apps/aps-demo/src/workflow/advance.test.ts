import { describe, expect, it } from 'vitest';
import { advanceToDecision } from './advance.ts';
import { createWorkflow, exportWorkflow, importWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from './index.ts';
import type { ScenarioId } from './types.ts';

describe('bounded advance to a business decision or outcome', () => {
  it('stops for expired permission without requesting a refresh or recording an order', () => {
    const start = createWorkflow(scenarioSpec('approval-delay'));
    const stopped = advanceToDecision(start);
    expect(stopped.status).toBe('blocked-recoverable');
    expect(stopped.running).toBe(false);
    expect(stopped.world.orders).toHaveLength(0);
    expect(stopped.journal).toEqual([]);
    expect(selectWorkflow(stopped).metrics.recoveryAttempts).toBe(0);
    expect(advanceToDecision(stopped)).toBe(stopped);
    expect(start.transitionCount).toBe(0);
    const recovered = workflowReducer(stopped, { type: 'recover', blockedEventId: stopped.blockedEventId! });
    const completed = advanceToDecision(recovered);
    expect(completed.status).toBe('completed');
    expect(completed.world.orders).toHaveLength(1);
    expect(completed.journal.map(entry => entry.command.type)).toEqual(['recover']);
  });

  it('retains an uncertain committed order until explicit reconciliation', () => {
    const stopped = advanceToDecision(createWorkflow(scenarioSpec('lost-purchase-response')));
    expect(stopped.status).toBe('outcome-unknown');
    expect(stopped.world.orders).toHaveLength(1);
    expect(selectWorkflow(stopped).metrics.completed).toBe(false);
    expect(selectWorkflow(stopped).metrics.reconciliationAttempts).toBe(0);
    expect(advanceToDecision(stopped)).toBe(stopped);
    const reconciled = workflowReducer(stopped, { type: 'reconcile', unknownEventId: stopped.unknownEventId! });
    const completed = advanceToDecision(reconciled);
    expect(completed.status).toBe('completed');
    expect(completed.world.orders).toEqual(stopped.world.orders);
    expect(completed.journal.map(entry => entry.command.type)).toEqual(['reconcile']);
  });

  it.each(['nominal', 'purchase-race'] as ScenarioId[])('preserves actual outcomes and a valid replay for %s', scenario => {
    const result = advanceToDecision(createWorkflow(scenarioSpec(scenario)));
    expect(result.status).toBe('completed');
    expect(result.world.orders).toHaveLength(1);
    expect(selectWorkflow(result).metrics.safeCompleted).toBe(true);
    expect(result.transitionCount).toBeLessThanOrEqual(result.spec.limits.maxTransitions);
    expect(importWorkflow(exportWorkflow(result)).ok).toBe(true);
    expect(advanceToDecision(result)).toBe(result);
  });

  it('does not hide unsafe effects in an unprotected race', () => {
    const result = advanceToDecision(createWorkflow(scenarioSpec('purchase-race', 'A')));
    expect(result.world.orders).toHaveLength(2);
    expect(selectWorkflow(result).metrics.safeCompleted).toBe(false);
    expect(selectWorkflow(result).metrics.unsafeCommittedEffects).toBeGreaterThan(0);
  });

  it('stops at failure and execution limits, leaving terminal runs unchanged', () => {
    const insufficientBudget = createWorkflow(scenarioSpec());
    insufficientBudget.spec.task.budget = 1;
    const failed = advanceToDecision(insufficientBudget);
    expect(failed.status).toBe('failed');
    expect(failed.world.orders).toHaveLength(0);
    expect(advanceToDecision(failed)).toBe(failed);
    const atLimit = createWorkflow(scenarioSpec());
    atLimit.transitionCount = atLimit.spec.limits.maxTransitions;
    const limited = advanceToDecision(atLimit);
    expect(limited.status).toBe('budget-exhausted');
    expect(limited.transitionCount).toBe(atLimit.transitionCount);
    expect(limited.running).toBe(false);
    expect(advanceToDecision(limited)).toBe(limited);
  });

  it('pauses an already playing run without inventing commands in its journal', () => {
    const playing = workflowReducer(createWorkflow(scenarioSpec()), { type: 'start' });
    const completed = advanceToDecision(playing);
    expect(completed.running).toBe(false);
    expect(completed.journal).toEqual([]);
    expect(playing.running).toBe(true);
  });
});
