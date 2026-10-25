import type { ScheduledTransition, TransitionKind, WorkflowState } from './types.ts';
export const priority: Record<TransitionKind, number> = { 'deliver-message': 0, 'consume-message': 1, 'commit-purchase': 2, 'purchase-response-timeout': 3 };
export class QueueBudget extends Error {}
export function allocate(state: WorkflowState, prefix: string): string { return prefix + '-' + String(state.nextId++).padStart(4, '0'); }
export function schedule(state: WorkflowState, kind: TransitionKind, messageId: string, dueAt: number, parents: string[]): void {
  if (state.queue.length >= 100) throw new QueueBudget('queue-bound');
  const transition: ScheduledTransition = { id: allocate(state, 'transition'), dueAt, priority: priority[kind], insertionSequence: state.nextId, kind, messageId, causedByEventIds: [...parents] };
  state.queue.push(transition);
  state.queue.sort((a, b) => a.dueAt - b.dueAt || a.priority - b.priority || a.insertionSequence - b.insertionSequence);
}
export function isTerminal(state: WorkflowState): boolean { return ['completed', 'failed', 'budget-exhausted'].includes(state.status); }
export function canAdvance(state: WorkflowState): boolean { return !isTerminal(state) && state.status !== 'blocked-recoverable' && state.status !== 'outcome-unknown' && state.queue.length > 0; }
