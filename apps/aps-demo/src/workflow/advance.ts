import { workflowReducer } from './engine.ts';
import { canAdvance } from './scheduler.ts';
import { LIMITS } from './types.ts';
import type { WorkflowState } from './types.ts';

/** A UI convenience over real engine steps, never an approval or recovery command.
 * The caller must apply this atomically to its latest state. Existing engine
 * boundaries stop the loop before any refresh or reconciliation choice.
 */
export function advanceToDecision(state: WorkflowState): WorkflowState {
  if (!canAdvance(state)) return state;
  let current = state;
  for (let count = 0; count < LIMITS.maxTransitions && canAdvance(current); count++) {
    const next = workflowReducer(current, { type: 'step' });
    if (next.transitionCount === current.transitionCount) return next;
    current = next;
  }
  return current;
}
