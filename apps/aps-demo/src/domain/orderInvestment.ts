import type { QuoteAttempt } from './audience.ts';
import type { ComparisonRun } from './comparison.ts';

// Illustrative active buyer minutes on equivalent requests.
export const buyerTiming = { baseline: 12, review: 2, releaseFollowUp: 4, holdFollowUp: 7 };
export const siteCosts = { monthlyRequests: 200, hourlyRate: 40, setup: 2400, monthly: 400 };
export const annualCost = siteCosts.setup + 12 * siteCosts.monthly;
export const breakEvenMinutes = annualCost * 60 / (12 * siteCosts.monthlyRequests * siteCosts.hourlyRate);
const releaseSaving = buyerTiming.baseline - buyerTiming.review - buyerTiming.releaseFollowUp;
const holdSaving = buyerTiming.baseline - buyerTiming.review - buyerTiming.holdFollowUp;

export function orderWork(run: ComparisonRun, quote: QuoteAttempt, available: number | null) {
  const released = run.results.C.executed;
  return {
    released, outcome: released ? 'Released' : 'Held', age: run.request.approvalAge,
    quote: quote.current ? 'Q-82 current' : 'Q-82 expired',
    stock: available === null ? 'Thursday stock unknown' : `${available} of 24 available Thursday`,
    followUp: released ? buyerTiming.releaseFollowUp : buyerTiming.holdFollowUp,
    saved: released ? releaseSaving : holdSaving,
    task: released
      ? 'Reconcile the supplier acknowledgment, price and arrival with the authorized order.'
      : 'Check open orders and incoming stock, then seek fresh authority if the bearings are still needed.',
  };
}
export type OrderWork = ReturnType<typeof orderWork>;

export const valueScenarios = [100, 50, 0].map(holdPercent => {
  const minutes = (holdPercent * holdSaving + (100 - holdPercent) * releaseSaving) / 100;
  const hours = siteCosts.monthlyRequests * minutes / 60;
  const gross = hours * siteCosts.hourlyRate * 12;
  return { holdPercent, minutes, hours, gross, net: gross - annualCost };
});
export type ValueScenario = typeof valueScenarios[number];
