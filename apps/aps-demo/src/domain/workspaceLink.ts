import { quoteAttempts, type QuoteAttempt } from './audience.ts';
import { presetDraft } from './cases.ts';
import { createComparison, type ComparisonRun } from './comparison.ts';
import { expiryTrials } from './replication.ts';

const purchase = presetDraft('stale');
export const timingRuns = [59, 60, 61].map(age => createComparison(
  'bearings-' + age, { ...purchase, approvalAge: String(age) },
));

export interface BearingsSelection {
  run: ComparisonRun;
  quoteAttempt: QuoteAttempt;
  available: number | null;
  trial: number;
}

export const defaultWorkspace: BearingsSelection = {
  run: timingRuns[1], quoteAttempt: quoteAttempts[0], available: null, trial: 15,
};

export function readWorkspace(query: string): BearingsSelection {
  const params = new URLSearchParams(query);
  const stock = params.get('stock');
  return {
    run: timingRuns.find(run => String(run.request.approvalAge) === params.get('age')) ?? defaultWorkspace.run,
    quoteAttempt: quoteAttempts.find(quote => quote.clock === params.get('quote')) ?? defaultWorkspace.quoteAttempt,
    available: stock === '0' || stock === '24' ? Number(stock) : null,
    trial: expiryTrials.find(trial => String(trial.sequence) === params.get('trial'))?.sequence ?? defaultWorkspace.trial,
  };
}

export function workspaceLink(selection: BearingsSelection): string {
  const query = new URLSearchParams({
    age: String(selection.run.request.approvalAge), quote: selection.quoteAttempt.clock,
    stock: selection.available === null ? 'unknown' : String(selection.available), trial: String(selection.trial),
  });
  return '#/overview?' + query.toString();
}
