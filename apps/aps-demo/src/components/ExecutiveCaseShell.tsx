import type { WorkflowState } from '../workflow/index.ts';
import { selectWorkflow } from '../workflow/index.ts';
export const executiveIssues = [
  { id: 'overview', name: 'Conceptual' }, { id: 'simulator', name: 'Analytical' }, { id: 'assurance', name: 'Pitch' },
] as const;
export function issueForRoute(route: string) { return executiveIssues.find(item => item.id === route) ?? executiveIssues[1]; }
export function CaseStatus({ state, route }: { state: WorkflowState; route: string }) {
  const view = selectWorkflow(state);
  return <section className="case-status" aria-label="Business case status"><strong>{issueForRoute(route).name} · {state.spec.task.id}</strong><span> {view.scenarioTitle} · mode {state.spec.mode} · {view.running ? 'running' : 'paused'} · {view.metrics.committedOrders} recorded orders · confirmation {view.metrics.completed ? 'supported' : 'absent'} · unsafe effects {view.metrics.unsafeCommittedEffects} · {state.status.replaceAll('-', ' ')}</span>{route !== 'simulator' && state.transitionCount > 0 && !view.running && <small>Purchasing remains paused while you review another section. Run, world and history retained.</small>}</section>;
}
export function ConceptualTask({ state }: { state: WorkflowState }) {
  return <section className="conceptual-task" aria-label="Case objective and boundary"><h2>One need. One bounded commitment.</h2><p>Keep a supplied need moving without unauthorized or duplicate purchasing. Agents may coordinate the modeled purchase; delivery, actual stock truth and real authorization remain outside scope.</p><details><summary>Open task {state.spec.task.id}</summary><p>Demand {state.spec.task.demand} · supplied stock {state.spec.task.stock} · price {state.spec.task.unitPrice} · budget {state.spec.task.budget} simulated units. Derived shortage: {state.world.quantity ?? 'not derived yet'}.</p><p>Discuss which decisions to delegate and who would own an exception. No real owner, risk appetite or benefit is established.</p></details></section>;
}
