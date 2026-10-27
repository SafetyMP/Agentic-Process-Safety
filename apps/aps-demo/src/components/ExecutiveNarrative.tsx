import { useState } from 'react';
import type { WorkflowState } from '../workflow/index.ts';
import { selectWorkflow } from '../workflow/index.ts';
import type { Selection } from './PurchasingOperations.tsx';

export const businessQuestions = {
  nominal: 'Can the ordinary purchase complete within the rules?',
  'approval-delay': 'Can purchasing proceed after permission expires?',
  'purchase-race': 'Can two proposals become two orders for one need?',
  'lost-purchase-response': 'Has the order been placed when the reply is missing?',
} as const;
export function outcomeHeadline(state: WorkflowState) {
  const { metrics: m } = selectWorkflow(state);
  if (m.unsafeCommittedEffects) return 'An order was recorded outside the modeled safeguards.';
  if (state.status === 'outcome-unknown') return 'An order is recorded; the reply is missing.';
  if (state.status === 'blocked-recoverable') return 'Expired permission stopped this attempt.';
  if (m.safeCompleted) return "The purchase is confirmed within the model's checks.";
  if (state.status === 'failed' || state.status === 'budget-exhausted') return 'Completion is not established.';
  if (!state.transitionCount) return 'This purchase has not been examined yet.';
  return state.running ? 'Work is continuing; the purchase is not yet confirmed.' : 'Work is paused; the purchase is not yet confirmed.';
}
export function ExecutiveOutcome({ state }: { state: WorkflowState }) {
  const { metrics: m } = selectWorkflow(state);
  return <section className="executive-outcome" aria-label="Observed purchasing result"><p className="eyebrow">OBSERVED IN THIS RUN</p><h2>{outcomeHeadline(state)}</h2><dl className="executive-result-facts"><div><dt>Orders recorded</dt><dd>{m.committedOrders}</dd></div><div><dt>Spend recorded</dt><dd>{m.spent} simulated units</dd></div><div><dt>Task confirmed</dt><dd>{m.completed ? 'Yes' : 'No'}</dd></div><div><dt>Unsafe modeled effects</dt><dd>{m.unsafeCommittedEffects}</dd></div></dl><p>{m.unsafeCommittedEffects ? m.completed ? 'Task confirmed does not mean acceptable completion. Inspect the commitment outside the modeled checks.' : 'An unsafe commitment exists; confirmation is absent.' : state.status === 'outcome-unknown' ? 'A missing response is not proof that no purchase occurred. Inspect the existing order before trying again.' : state.status === 'blocked-recoverable' ? 'Inspect the expired permission and denial before requesting a fresh simulated decision. Stopping adds delay; its business cost is unmeasured.' : m.safeCompleted ? 'Confirmation and the required model checks are satisfied. This does not establish real-world safety or delivery.' : 'Advance the example to see which records are created. Progress alone is not a completed purchase.'}</p><p>Completion with required model checks: {m.safeCompleted ? 'satisfied' : 'not established'}. This is separate from Task confirmed.</p><section aria-label="Current workflow run"><details><summary>Business confirmation and model checks</summary><p>business confirmation: {m.completed ? 'confirmed' : 'not confirmed'} · safe model completion: {m.safeCompleted ? 'yes' : 'no'} · unsafe effects {m.unsafeCommittedEffects}</p></details></section><p data-executive-uncertainty>Delivery, real authorization, business costs/benefits and acceptable residual risk are not established.</p></section>;
}
const positions = ['Fresh permission at commitment', 'One commitment per purchase intent', 'Check for an existing order before retrying', 'More evidence before a recommendation'] as const;
type DiscussionSnapshot = { generation: number; taskId: string; scenario: string; mode: string; status: string; transitionCount: number; selectedEventId: string | null; eventIds: string[]; orderIds: string[]; orders: number; spend: number; confirmed: boolean; unsafe: number; safeCompleted: boolean; observed: boolean };
type DiscussionDraft = { position: string; snapshot: DiscussionSnapshot };
/** App-memory presentation state only. Repeated specs/IDs cannot revive an old draft. */
export function useExecutiveDiscussion(state: WorkflowState, selection: Selection | null) {
  const [observation, setObservation] = useState({ state, generation: 0 });
  const [draft, setDraft] = useState<DiscussionDraft | null>(null);
  if (observation.state !== state) setObservation({ state, generation: observation.generation + 1 });
  function choose(position: string) {
    const view = selectWorkflow(state);
    const events = state.events.filter(e => ['purchase-decided', 'order-committed', 'response-timeout', 'reconciliation-observed'].includes(e.type));
    const selected = selection?.kind === 'exception' ? state.events.find(e => e.id === selection.id) : selection?.kind === 'order' ? state.events.find(e => e.type === 'order-committed' && e.data.orderId === selection.id) : null;
    setDraft({ position, snapshot: { generation: observation.generation, taskId: state.spec.task.id, scenario: businessQuestions[state.spec.scenario], mode: state.spec.mode, status: state.status, transitionCount: state.transitionCount, selectedEventId: selected?.id ?? null, eventIds: events.map(e => e.id), orderIds: state.world.orders.map(o => o.id), orders: view.metrics.committedOrders, spend: view.metrics.spent, confirmed: view.metrics.completed, unsafe: view.metrics.unsafeCommittedEffects, safeCompleted: view.metrics.safeCompleted, observed: events.length > 0 } });
  }
  return { draft, choose, stale: !!draft && draft.snapshot.generation !== observation.generation, observed: state.events.some(e => ['purchase-decided', 'order-committed', 'response-timeout', 'reconciliation-observed'].includes(e.type)) };
}
export function ExecutiveDiscussion({ discussion }: { discussion: ReturnType<typeof useExecutiveDiscussion> }) {
  const { draft, choose, stale, observed } = discussion;
  return <section className="executive-discussion" aria-label="Non-binding discussion draft"><p className="eyebrow">DISCUSSION DRAFT — NOT PERSISTED OR APPROVED</p><fieldset><legend>What would you ask your team to specify?</legend>{positions.map(position => <label key={position}><input type="radio" name="discussion-position" value={position} checked={draft?.position === position} onKeyDown={event => { if (event.key === ' ' && draft?.position === position) { event.preventDefault(); choose(position); } }} onChange={() => choose(position)} onClick={() => { if (draft?.position === position) choose(position); }}/>{position}</label>)}</fieldset><p>{observed ? 'A recorded purchasing observation is available to examine; no position is automatically validated.' : 'No purchasing decision observed; these positions are hypotheses.'}</p>{draft && <><p><strong>Your discussion position:</strong> {draft.position}. Discuss with the process owner and the team implementing the safeguard. No owner is assigned here.</p><p role="status" aria-label="Discussion draft status">{stale ? 'The run has changed—review this draft again.' : 'Based on the observations you last chose to discuss; not an approval or a validated recommendation.'}</p><p>Choose a position again to reconsider against current observations. Reload discards this draft.</p><details><summary>Observations attached to this discussion</summary><p>{draft.snapshot.taskId} · {draft.snapshot.scenario} · mode {draft.snapshot.mode} · {draft.snapshot.transitionCount} transitions · {draft.snapshot.status}. {draft.snapshot.orders} orders · {draft.snapshot.spend} simulated units · Task confirmed {draft.snapshot.confirmed ? 'Yes' : 'No'} · unsafe effects {draft.snapshot.unsafe} · safe model completion {draft.snapshot.safeCompleted ? 'Yes' : 'No'}.</p><p>Recorded orders: {draft.snapshot.orderIds.join(', ') || 'none'}. Decision/effect events: {draft.snapshot.eventIds.join(', ') || 'none'}. Selected event: {draft.snapshot.selectedEventId ?? 'none'}. {draft.snapshot.observed ? 'Purchasing observation present.' : 'No purchasing decision was observed.'} This is a memory-only discussion snapshot, not an evidence receipt or unique run identity.</p></details></>}</section>;
}
