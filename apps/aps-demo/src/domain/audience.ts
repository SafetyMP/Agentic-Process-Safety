import { runTitle } from './presentation.ts';
import type { ComparisonRun } from './comparison.ts';

declare const __APS_BUILD__: string;
export const buildLabel = typeof __APS_BUILD__ === 'string' ? __APS_BUILD__ : 'unversioned development build';

export const fieldUpdates = {
  inbound: {
    title: 'Wednesday inbound confirmed',
    record: 'Inbound PO-417 • receiving desk, Tuesday 10:00. All 24 bearings are confirmed for Wednesday at 14:00. The planner has reserved them for Thursday’s assembly run.',
  },
  shortage: {
    title: 'Thursday requirement uncovered',
    record: 'Material plan MP-31 • planner, Tuesday 10:00. No inbound supply covers the 24 bearings. Quote Q-82 • buyer, Tuesday 10:05. Supplier confirms delivery by Wednesday if the order is placed by Tuesday 14:00. Quote valid until that cutoff.',
  },
  replay: {
    title: 'Purchase acknowledgment missing',
    record: 'PO register • buyer, Tuesday 10:10. The previous purchase attempt has no acknowledgment in the team inbox. The supplier’s order ledger has yet to be reconciled. Confirm its status before recommending a retry.',
  },
};
export type UpdateId = keyof typeof fieldUpdates;
export const requisition = 'REQ-218 · North assembly · 24 bearings needed Thursday at 08:00 · 0 available on hand. Source: material plan MP-31, Tuesday 09:30. All times are plant local.';
export const handoffFields = {
  disposition: 'Proposed disposition', owner: 'Action owner', due: 'Due by', evidence: 'Evidence supporting the decision',
  checkpoint: 'Next checkpoint', escalate: 'Escalate if', rationale: 'Reason or dissent',
};
export const pilotFields = {
  decision: 'Sponsor decision', scope: 'Site and purchase category', sponsor: 'Accountable sponsor', authority: 'Policy owner and renewal authority',
  serviceOwner: 'Material availability owner', stop: 'Stop condition and who can pause', review: 'Next review date', tradeoff: 'Trade-off and evidence that would change the decision',
  window: 'Observation window and measure owners', minutes: 'Handling minutes per hold', rate: 'Labor cost per hour', expedite: 'Expedite cost per hold',
};
export type Handoff = Record<keyof typeof handoffFields, string>;
export type Pilot = Record<keyof typeof pilotFields, string>;
export type FieldWork = { selected: UpdateId; drafts: Partial<Record<UpdateId, Handoff>> };

export function blankFields<K extends string>(labels: Record<K, string>): Record<K, string> {
  return Object.fromEntries(Object.keys(labels).map(key => [key, ''])) as Record<K, string>;
}
export function eligibleUpdates(run: ComparisonRun): UpdateId[] {
  if (run.caseId === 'replay') return ['replay'];
  return run.caseId === 'stale' && run.results.C.decision === 'deny' ? ['inbound', 'shortage'] : [];
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function readFields<K extends string>(value: unknown, labels: Record<K, string>): Record<K, string> {
  if (!object(value)) throw new Error('Invalid saved audience worksheet.');
  const fields = blankFields(labels);
  for (const key of Object.keys(fields) as K[]) {
    if (typeof value[key] !== 'string') throw new Error('Invalid saved audience field.');
    fields[key] = value[key];
  }
  return fields;
}
export function readFieldWork(value: unknown, run: ComparisonRun): FieldWork {
  const allowed = eligibleUpdates(run);
  if (!object(value) || !object(value.drafts) || !allowed.some(id => id === value.selected)) throw new Error('Invalid purchasing update for this comparison.');
  const drafts: FieldWork['drafts'] = {};
  for (const [key, draft] of Object.entries(value.drafts)) {
    const id = allowed.find(id => id === key);
    if (!id) throw new Error('Saved handoff belongs to another case.');
    drafts[id] = readFields(draft, handoffFields);
  }
  return { selected: value.selected as UpdateId, drafts };
}
function linesFor<K extends string>(labels: Record<K, string>, values: Record<K, string>) {
  return (Object.keys(labels) as K[]).map(key => labels[key] + ': ' + (values[key].trim() || 'Open'));
}
export function runReference(run: ComparisonRun) {
  return [run.id, run.requestIdentity, run.modelVersion, 'Run build: ' + (run.build ?? 'unrecorded (older session)')].join(' · ');
}
export function handoffBrief(run: ComparisonRun, id: UpdateId, values: Handoff) {
  const c = run.results.C;
  return ['# APS shift handoff', runReference(run), 'Lane C · ' + c.decision.toUpperCase() + ' · ' + c.reason,
    c.businessOutcome, 'Modeled request: ' + run.request.amount + ' simulated spend units; approval age ' + run.request.approvalAge + ' logical seconds.',
    '## Fictional field update', ...(id === 'replay' ? [] : [requisition, 'Finance record: original approval expired at release. A renewed approval has yet to be supplied.']),
    fieldUpdates[id].title, fieldUpdates[id].record, '## Next shift · proposed action', ...linesFor(handoffFields, values),
    'Discussion only. This handoff grants no purchasing authority.'].join('\n\n');
}
export const pilotMeasures = [
  ['Expired releases / attempted releases', 'PO release and approval histories', 'Procurement controls'],
  ['Buyer minutes / requisition', 'Time observation, including follow-up', 'Purchasing lead'],
  ['Time a shortage stays open', 'Exception and resolution timestamps, including still-open holds', 'Materials planner'],
  ['Requirements covered by need date / requirements due', 'Demand, receipts and usable stock', 'Site operations'],
];
export function costEstimate(pilot: Pilot): string {
  const numbers = [pilot.minutes, pilot.rate, pilot.expedite];
  if (numbers.some(s => !s.trim() || !Number.isFinite(Number(s)) || Number(s) < 0)) return 'Enter three nonnegative assumptions to estimate handling and expedite cost per hold.';
  const cost = Number(pilot.minutes) / 60 * Number(pilot.rate) + Number(pilot.expedite);
  return Number.isFinite(cost) ? cost.toFixed(2) + ' currency units per hold (illustrative assumption).' : 'Cost exceeds the supported range.';
}
export function pilotBrief(run: ComparisonRun, values: Pilot) {
  const show = (key: keyof Pilot) => values[key].trim() || 'Open';
  const outcome = (mode: 'B' | 'C') => {
    const lane = run.results[mode];
    return '- ' + mode + ': ' + lane.decision + '. ' + lane.reason + ' ' + lane.businessOutcome +
      (lane.effect ? ' Orders: ' + lane.effect.after.orders + '. Spend: ' + lane.effect.after.spend + ' simulated units.' : '');
  };
  const sections = [
    '# Purchasing pilot decision', '**' + show('decision') + '** · ' + show('scope'),
    'Sponsor: ' + show('sponsor') + ' · Review: ' + show('review'),
    '## Decision basis', runTitle(run) + ' · ' + run.request.amount + ' simulated spend units · approval age ' + run.request.approvalAge + ' logical seconds.',
    runReference(run), ...(run.parent ? ['Hypothetical recovery from ' + run.parent.runId + ', lane ' + run.parent.lane + ', starting with its no-order state.'] : []),
    outcome('B'), outcome('C'), '## Proposed evaluation',
    'Compare buyer-led ERP with shadow agent recommendations for matched requisitions under the same policy and records. People retain release authority.',
    '- Trade-off and evidence that would change the decision: ' + show('tradeoff'),
    '- Policy and renewal authority: ' + show('authority') + '. Material availability owner: ' + show('serviceOwner'),
    '- Stop condition and who can pause: ' + show('stop'),
    '- Observation window and measure owners: ' + show('window'),
    '', '| Proposed field measure | Data source | Suggested owner |', '| --- | --- | --- |',
    ...pilotMeasures.map(row => '| ' + row.join(' | ') + ' |'),
  ];
  if ([values.minutes, values.rate, values.expedite].some(v => v.trim())) {
    sections.push('', 'Illustrative sensitivity: ' + show('minutes') + ' minutes, ' + show('rate') +
      ' currency units/hour, ' + show('expedite') + ' expedite cost. ' + costEstimate(values));
  }
  sections.push('', 'Draft for sponsor discussion. Field outcomes await measurement.');
  return sections.join('\n');
}
