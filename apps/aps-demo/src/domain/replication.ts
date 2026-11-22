import type { ComparisonRun } from './comparison.ts';
import { experiment, manifest } from '../data.ts';

const csv = (rows: (string | number)[][]) => rows.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
export function comparisonCsv(runs: ComparisonRun[]) {
  return csv([['source','run_build','model','run_id','request_id','case','parent_run','baseline_orders','baseline_spend','age_seconds','amount_spend_units','bundle','decision','orders_after'],
    ...runs.flatMap(run => (['B','C'] as const).map(mode => ['browser',run.build ?? 'unrecorded',run.modelVersion,run.id,run.requestIdentity,run.caseId,run.parent?.runId ?? '',run.baseline.orders,run.baseline.spend,run.request.approvalAge,run.request.amount,mode,run.results[mode].decision,run.results[mode].effect?.after.orders ?? '']))]);
}
export const expiryTrials = experiment.trials.filter(t => t.fault === 'stale_approval' && (t.configuration === 'B' || t.configuration === 'C'));
export function recordedCsv() {
  return csv([['source','selection','case_id','case_digest','sequence','record_sha256','bundle','unsafe_mutations','attack_calls','completed'],
    ...expiryTrials.map(t => ['frozen',manifest.evidence_directory,t.case_id,t.case_digest,t.sequence,t.hash,t.configuration,t.outcome.unsafe_mutations,t.outcome.attack_attempts,String(t.completed)])]);
}
export const fieldProtocol = [
  '# Purchasing field-study worksheet',
  'Research question and prediction:',
  'Unit: one requisition. Select comparable requisitions with the same site, urgency, value band and supplier lead time. Record the assignment or matching method.',
  'Comparator: buyer-led ERP and agent-assisted buying. Specify the common approval policy, release authority and access to stock, purchase history and supplier terms.',
  'Define primary outcome, numerator, denominator and observation window before reviewing results. Distinguish expired releases per attempted release, buyer minutes per requisition and time from hold to resolution.',
  'Record whether the business need was covered by its deadline. Retain open holds at the end of follow-up as censored observations and report missing records separately.',
  'Record data owners, sample selection, exclusions, alternative explanations and what result would challenge your prediction.',
].join('\n\n');
export const studentSheet = [
  '# Purchasing case • learner sheet',
  'Finance approved a purchase. Release is attempted after 61 logical seconds. Finance authority is current only below 60. B checks permission and spend. C also checks approval freshness.',
  'Before comparing, predict which bundle will release at 59, 60 and 61 seconds. Explain what you held fixed. Record your prediction in the Case Lab or on this sheet.',
  '| Age | Predicted B / C | Observed B / C orders | Run ID | Explanation |','| --- | --- | --- | --- | --- |','| 59 | | | | |','| 60 | | | | |','| 61 | | | | |',
  'Your instructor assigns one purchasing update. What should the next shift do? Identify a source, owner, deadline and a fact that would change your recommendation.',
  'Exchange handoffs. Can you act from the other team’s brief? Apply your reasoning to a missing purchase acknowledgment.',
].join('\n');
export const instructorKit = [
  '# Instructor guide • 20 minutes','Learning objectives: predict a strict expiry boundary, distinguish spending authority from material need, and support a handoff with evidence.',
  'Minutes 0–3: distribute the learner link or sheet before showing any results. Collect predictions. Minutes 3–8: pairs run 59, 60 and 61 with the same amount and baseline. Minutes 8–14: assign half the pairs the inbound update and half the uncovered need. Each exports a shift handoff. Minutes 14–20: swap briefs, debrief, then try replay.',
  'Answer key: B creates one modeled order at all three ages. C creates one at 59 and zero at 60 and 61. At 61 the same C hold can justify proposing closure after reconciling the inbound PO, or routing for fresh authority after checking prior orders and the valid quote. Accept other defensible choices.',
  'Score one point each for identifying the decisive condition, citing the record behind the disposition, naming an alternative explanation, and identifying evidence that would change the decision. On transfer, ask which original receipt the buyer must reconcile before another attempt.',
  'Debrief: Which conclusion comes from the rule? Which comes from the fictional purchasing records? What needs field observation? Repeating an identical browser input adds no independent requisition.',
].join('\n\n');
