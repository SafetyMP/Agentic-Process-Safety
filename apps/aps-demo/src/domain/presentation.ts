import type { ComparisonRun, LaneResult } from './comparison.ts';
import { getCase } from './cases.ts';

/** Describe a retained input, rather than borrowing a preset's original outcome. */
export function runTitle(run: ComparisonRun): string {
  if (run.parent) return 'Hypothetical purchase with renewed approval';
  if (run.caseId === 'stale' && run.request.approvalAge < 60) return 'Purchase with current approval';
  return getCase(run.caseId).title;
}

export function laneMeaning(result: LaneResult) {
  if (result.executedViolations.length) return { tone: 'violation', label: 'Invalid condition carried into execution' } as const;
  if (result.decision === 'review') return { tone: 'review', label: 'Review needed · question unresolved' } as const;
  if (result.decision === 'deny') return { tone: 'held', label: 'Modeled boundary held · request stopped' } as const;
  return { tone: 'clear', label: result.mode === 'A' ? 'No checks applied · wider questions remain' : 'Declared checks pass · wider questions remain' } as const;
}

export interface PathStage { id: string; title: string; type: string; detail: string; value: string }

/** Explanatory views of frozen inputs and decisions; these never simulate events. */
export function decisionPath(run: ComparisonRun): PathStage[] {
  const r = run.request;
  const definition = getCase(run.caseId);
  const assumed = 'Declared assumption';
  const input = 'Modeled input';
  let opening: [PathStage, PathStage];
  switch (run.caseId) {
    case 'stale': opening = [
      { id: 'premise', title: run.parent ? 'New approval assumed' : 'Finance approval assumed', type: assumed, value: r.approved ? 'Matching approval available' : 'Approval absent', detail: run.parent ? 'A new matching finance approval is assumed for this hypothetical request. Both lanes start from the earlier C lane’s unchanged state; no finance worker issued an approval here.' : 'The request assumes a matching finance approval was available before this attempt. The browser does not run the finance worker or check a quotation.' },
      { id: 'condition', title: r.approvalAge >= 60 ? 'Approval expires' : 'Approval remains current', type: input, value: `${r.approvalAge}s · ${r.approvalAge >= 60 ? 'outside' : 'inside'} the below-60s rule`, detail: `At ${r.approvalAge} logical seconds, the approval ${r.approvalAge >= 60 ? 'has reached or passed' : 'has not reached'} its 60-second boundary. Age 60 already fails the fixed “below 60” rule. Reading this page does not age the request.` },
    ]; break;
    case 'unauthorized': opening = [
      { id: 'premise', title: 'Supplier role declared', type: assumed, value: 'Quotations are the intended work', detail: 'The supplier role is intended to provide quotations. This case asks what happens when a request instead attempts the purchase tool.' },
      { id: 'condition', title: r.actor === 'purchase' ? 'Purchase authority present' : 'Purchase authority absent', type: input, value: `Actor: ${r.actor}`, detail: `The frozen actor is ${r.actor}. Both B and C restrict purchase tool use to the purchase actor; an added lifecycle check is not needed to stop this mismatch.` },
    ]; break;
    case 'spending': opening = [
      { id: 'premise', title: 'Spend ceiling declared', type: assumed, value: 'Maximum 1000 sandbox units', detail: 'Both selected bundles apply the same positive-amount and 1000-unit ceiling. This is a model policy, not a live account balance.' },
      { id: 'condition', title: r.amount > 1000 ? 'Request exceeds ceiling' : 'Amount within ceiling', type: input, value: `${r.amount} sandbox units requested`, detail: `The requested amount is ${r.amount} against a ceiling of 1000. The actor can have tool permission while this amount is still impermissible.` },
    ]; break;
    case 'delegation': opening = [
      { id: 'premise', title: 'Bounded delegation intended', type: assumed, value: 'Depth at most three', detail: 'The intended work permits bounded delegation. A depth limit is a modeled condition; this view does not execute a chain of workers.' },
      { id: 'condition', title: r.depth > 3 ? 'Delegation exceeds limit' : 'Delegation within limit', type: input, value: `Depth ${r.depth} · limit 3`, detail: `This request carries delegation depth ${r.depth}. B does not inspect it; C checks depth at most three. Resource exhaustion and downstream timing are not simulated.` },
    ]; break;
    case 'approval': opening = [
      { id: 'premise', title: 'Matching approval required', type: assumed, value: 'Authority must match the purchase', detail: 'Finance authorization must match the requested purchase. Tool permission alone does not supply that authorization.' },
      { id: 'condition', title: r.approved ? 'Matching approval present' : 'Matching approval absent', type: input, value: r.approved ? 'Approval flag: present' : 'Approval flag: missing', detail: `The request marks matching approval as ${r.approved ? 'present' : 'absent'}. The browser evaluates this supplied condition; it does not contact finance or issue approval.` },
    ]; break;
    case 'replay': opening = [
      { id: 'premise', title: 'One execution intended', type: assumed, value: 'A purchase nonce may be used once', detail: 'The intended condition is uniqueness of the purchase attempt. The browser does not reconstruct an earlier order or its effects.' },
      { id: 'condition', title: r.replay ? 'Nonce marked consumed' : 'Nonce marked unused', type: input, value: r.replay ? 'Replay flag: true' : 'Replay flag: false', detail: `The frozen request marks its nonce as ${r.replay ? 'already consumed' : 'unused'}. C checks this replay condition. The input flag is not a newly observed duplicate purchase.` },
    ]; break;
    case 'conflict': opening = [
      { id: 'premise', title: 'Competing goals declared', type: assumed, value: 'Speed and finance constraints', detail: 'The stated objective is to balance procurement speed and finance constraints. No priorities, trade-off costs or arbitration process are supplied by this browser model.' },
      { id: 'condition', title: r.objectivesResolved ? 'Objectives marked resolved' : 'Trade-off remains unresolved', type: input, value: r.objectivesResolved ? 'Resolved input: true' : 'Resolved input: false', detail: `The input marks objectives as ${r.objectivesResolved ? 'resolved' : 'unresolved'}. A request for human review does not decide which objective should prevail or resolve the disagreement.` },
    ]; break;
    case 'context': opening = [
      { id: 'premise', title: 'Task-bound context required', type: assumed, value: 'Information must belong to this task', detail: 'The purchase must use context bound to its own task. Content that is plausible is not automatically authoritative for this request.' },
      { id: 'condition', title: r.contextBound ? 'Context belongs to this task' : 'Context belongs elsewhere', type: input, value: r.contextBound ? 'Binding flag: true' : 'Binding flag: false', detail: `The purchase request marks task binding as ${r.contextBound ? 'valid' : 'invalid'}. This models a binding condition, not an observed agent following injected instructions. The related recorded case tests a demand-stage request.` },
    ]; break;
    case 'normal': opening = [
      { id: 'premise', title: 'Authorized purchase intended', type: assumed, value: 'Matching task and approval assumed', detail: 'The illustration assumes a matching approval and task context for one purchase. These prerequisites are inputs, not independently verified business facts.' },
      { id: 'condition', title: 'Declared inputs satisfy checks', type: input, value: `${r.approvalAge}s approval · ${r.amount} sandbox units`, detail: `The request uses the ${r.actor} actor, ${r.amount} sandbox units, approval age ${r.approvalAge}, and the preset binding and uniqueness conditions. Both selected bundles permit it; additional checks need not change the outcome.` },
    ]; break;
  }
  const b = run.results.B;
  const c = run.results.C;
  const terminal = c.checks.find(check => check.status === 'fail');
  const bAction = b.decision === 'allow' ? 'permits the request' : b.decision === 'deny' ? 'also stops the request' : 'requests review';
  return [...opening,
    { id: 'request', title: 'Request reaches the checks', type: input, value: `${r.actor} · ${r.amount} sandbox units`, detail: `Both B and C receive this exact frozen ${r.actor} request for ${r.amount} sandbox units and the same starting state. Only their check bundles differ. No independent agents execute here.` },
    { id: 'checks', title: c.decision === 'review' ? 'C asks for a human decision' : c.decision === 'deny' ? 'C stops at the condition' : 'Both bundles permit the request', type: 'Modeled decision', value: terminal?.rule ?? 'All C checks pass', detail: terminal ? `C stops at ${terminal.rule}: ${terminal.reason}. Later checks are not evaluated. B ${bAction}. ${c.decision === 'review' ? 'The conflict remains open; no arbitration or human authorization occurs.' : 'Stopping execution does not complete the outstanding work.'}` : 'All modeled C checks pass, and B also permits this request. A permitted request does not establish that the quotation, stock record or demand is correct.' },
    { id: 'effects', title: c.decision === 'review' ? 'Decision remains outstanding' : c.effect && !c.executed ? 'Purchase remains outstanding' : c.effect ? 'Illustrative order created' : 'Business outcome unmeasured', type: c.effect ? 'Illustrative projection' : 'Unmodeled business outcome', value: c.effect ? c.executed ? `C: ${c.effect.before.orders} → ${c.effect.after.orders} orders` : 'C: no order created' : 'No downstream effects projected', detail: `B: ${b.businessOutcome} C: ${c.businessOutcome} ${definition.limitation}` },
  ];
}
