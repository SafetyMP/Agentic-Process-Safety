import { useState } from 'react';
import type { ComparisonRun } from '../domain/comparison.ts';
import { timingRuns } from '../domain/workspaceLink.ts';
import { annualCost, breakEvenMinutes, buyerTiming, siteCosts, valueScenarios, type OrderWork, type ValueScenario } from '../domain/orderInvestment.ts';
import { bearingsOrder, type QuoteAttempt } from '../domain/audience.ts';

export function ApprovalExhibit({ quoteAttempt, available, run, onRunChange }: {
  quoteAttempt: QuoteAttempt; available: number | null; run: ComparisonRun; onRunChange: (selection: ComparisonRun) => void;
}) {
  const held = !run.results.C.executed;
  const stockLabel = available === null ? 'Availability unknown' : `${available} of ${bearingsOrder.quantity} bearings available`;
  return <figure className="case-exhibit approval-exhibit">
    <figcaption>{bearingsOrder.id} at release · {quoteAttempt.time}</figcaption>
    <p className="quote-at-release"><strong>{quoteAttempt.current ? 'Q-82 is current' : 'Q-82 has expired'}.</strong> Supplier cutoff {bearingsOrder.quoteCutoff}. APS checks finance approval age. The buyer verifies the supplier’s terms.</p>
    <ol className="order-flow" aria-label="Purchase handoff">
      <li><strong>Finance approves</strong><span>0 seconds</span></li>
      <li><strong>The request waits</strong><span>{run.request.approvalAge} seconds elapse</span></li>
      <li><strong>Purchasing checks</strong><span>{held ? 'Approval has expired' : 'Approval is current'}</span></li>
    </ol>
    <p id="release-prompt">How old is finance approval at {quoteAttempt.time}?</p>
    <div className="exhibit-controls" role="group" aria-labelledby="release-prompt">
      {timingRuns.map(option => <button type="button" key={option.id} aria-pressed={option.id === run.id}
        onClick={() => onRunChange(option)}>{option.request.approvalAge} seconds</button>)}
    </div>
    <div aria-live="polite" aria-atomic="true">
      <dl className="release-lanes" aria-label="Modeled purchase decisions">
        {(['B', 'C'] as const).map(lane => <div key={lane} data-outcome={run.results[lane].executed ? 'release' : 'hold'}>
          <dt>{lane === 'B' ? 'Permission and spend' : 'APS finance approval check'}</dt>
          <dd>{run.results[lane].executed ? 'Release' : 'Hold'}</dd>
        </div>)}
      </dl>
      <p className="exhibit-reading">{held
        ? 'APS catches the expired finance approval and holds this purchase. Permission and spend alone would let it go out.'
        : quoteAttempt.current
          ? 'Both models release the purchase. Finance approval is fresh and the selected plant time falls inside the supplier’s quote window.'
          : 'Both models release the purchase on fresh finance approval even though Q-82 has expired. The APS check never examined the supplier’s terms.'}</p>
    </div>
    <section className="buyer-handoff" aria-labelledby="buyer-handoff">
      <h3 id="buyer-handoff" tabIndex={-1}>Buyer handoff for {bearingsOrder.id}</h3>
      <dl>
        <div><dt>Supplier and finance</dt><dd>
          {held
            ? 'Check open orders and inbound supply before seeking fresh authority for any remaining shortage.'
            : 'Reconcile the purchase with the supplier’s acknowledgment. Check the accepted price, quantity and promised arrival against the authorized order.'}
          {' '}{quoteAttempt.current && held && 'If a purchase is still needed, confirm how long the supplier will honor Q-82 and its Wednesday delivery date.'}
          {quoteAttempt.current && !held && 'Confirm the supplier accepted Q-82 by its cutoff before relying on Wednesday delivery.'}
          {!quoteAttempt.current && 'Get updated terms from the supplier if the order is still needed. Refer any price above the authorized amount to finance.'}
        </dd></div>
        <div><dt>North assembly · {bearingsOrder.needBy}</dt><dd><strong>{stockLabel}.</strong>{' '}
          {available === null ? 'Ask receiving and planning to match actual receipts and reserved stock to all 24 bearings by the need date.'
            : available === 0 ? 'In the selected Thursday record the line is short all 24. Before the run, track inbound stock with receiving and arrange another source or assembly slot if it will miss the deadline.'
            : 'In the selected Thursday record all 24 are on hand and allocated. Confirm the allocation with the planner and reconcile any open purchase to avoid a duplicate.'}
        </dd></div>
      </dl>
    </section>
  </figure>;
}

function money(amount: number) {
  return '$' + Math.abs(amount).toLocaleString('en-US');
}

function netLabel(amount: number) {
  if (amount === 0) return '$0';
  return (amount < 0 ? '−' : '+') + money(amount);
}

const chartExtent = Math.max(...valueScenarios.map(item => Math.abs(item.net)));

export function ValueExhibit({ scenario, onChange, work }: {
  work: OrderWork;
  scenario: ValueScenario;
  onChange: (selection: ValueScenario) => void;
}) {
  return <figure className="case-exhibit economics-exhibit">
    <figcaption>What happens to the buyer’s {buyerTiming.baseline} minutes?</figcaption>
    <div className="order-time">
      <h3>{bearingsOrder.id} · {work.outcome}</h3>
      <p>Assume buyer-led purchasing takes {buyerTiming.baseline} minutes of active work on a comparable request. With agent assistance, allow {buyerTiming.review} minutes to review the recommendation. The buyer still has follow-up work. {work.task}</p>
      <div className="buyer-time-strip" style={{ gridTemplateColumns: `${buyerTiming.review}fr ${work.followUp}fr ${work.saved}fr` }}>
        <div><b>{buyerTiming.review} min</b><span>Review</span></div>
        <div><b>{work.followUp} min</b><span>Follow-up</span></div>
        <div><b>{work.saved} min</b><span>Freed</span></div>
      </div>
      <p><strong>{buyerTiming.baseline} − {buyerTiming.review} − {work.followUp} = {work.saved} min</strong> freed on this request. Allow {buyerTiming.releaseFollowUp} minutes of follow-up for a release and {buyerTiming.holdFollowUp} for a hold in this example. Time actual requests through resolution to replace the assumptions.</p>
    </div>
    <h3>From one request to a year at the site</h3>
    <p>Across {siteCosts.monthlyRequests} eligible requests per month at {money(siteCosts.hourlyRate)}/hour, the mix of releases and holds determines the average. A saving of {breakEvenMinutes} minutes per request covers {money(siteCosts.setup)} in setup and {money(siteCosts.monthly)} a month to operate.</p>
    <p id="time-prompt">Choose the share of site requests held to see year-one capacity value.</p>
    <div className="value-chart" role="group" aria-labelledby="time-prompt">
      <div className="value-axis" aria-hidden="true"><span>Site mix</span><span>$0 break-even</span><span>Net value</span></div>
      {valueScenarios.map(option => {
        const width = Math.abs(option.net) / chartExtent * 50;
        return <button type="button" key={option.minutes} className="value-row" aria-label={option.minutes + ' minutes saved'}
          aria-describedby={`mix-${option.minutes} net-${option.minutes}`} aria-pressed={option.minutes === scenario.minutes} onClick={() => onChange(option)}>
          <span className="value-label">{option.minutes} min<small id={'mix-' + option.minutes}>{option.holdPercent}% held</small></span>
          <span className="value-track" aria-hidden="true">
            <i className="value-bar" data-sign={Math.sign(option.net)} style={{ left: (option.net < 0 ? 50 - width : 50) + '%', width: width + '%' }}/>
          </span>
          <strong className="value-number" id={'net-' + option.minutes}>{netLabel(option.net)}</strong>
        </button>;
      })}
    </div>
    <p className="value-reading" role="status" aria-atomic="true">
      <strong>{netLabel(scenario.net)} in year one.</strong> With {scenario.holdPercent}% held, the site averages {scenario.minutes} minutes saved and frees {scenario.hours} buyer hours per month. That capacity is worth {money(scenario.gross)} in a year against {money(annualCost)} in costs.
    </p>
    <p className="exhibit-note">Price the change to the existing purchasing system and the four-week shadow pilot separately. Buyer time has value if the site can use it. Cash savings require lower spending.</p>
  </figure>;
}

const choices = [
  { id: 'buyer', label: 'Keep buyer-led purchasing' },
  { id: 'rule', label: 'Add the approval check' },
  { id: 'pilot', label: 'Run a shadow pilot' },
] as const;
type Choice = typeof choices[number]['id'];

export function DecisionExhibit({ scenario, work }: { scenario: ValueScenario; work: OrderWork }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const responses = {
    buyer: 'Ask a buyer to check authority before release. Sample comparable orders for four weeks and time the work through receipt or resolution of the hold.',
    rule: 'Have the purchasing system recheck approval at release and route each hold to a named buyer. Price this option and time the follow-up it still requires.',
    pilot: 'For four weeks, let the agent recommend an action while buyers keep authority. Log disagreements, review minutes, open holds and actual receipts by need date. Pause for any recommendation to release on expired authority.',
  };
  return <div className="decision-exhibit">
    <div className="decision-record">
      <h3>{bearingsOrder.id} · {work.outcome}</h3>
      <p>{work.age}-second approval · {work.quote} · {work.stock}.</p>
      <p><strong>{work.saved} minutes freed on this example.</strong> Your site assumption is {scenario.holdPercent}% held, averaging {scenario.minutes} minutes freed per request and {netLabel(scenario.net)} in first-year capacity value after costs.</p>
    </div>
    <section className="pilot-evidence" aria-labelledby="pilot-evidence-title">
      <h3 id="pilot-evidence-title" tabIndex={-1}>What would justify a pilot?</h3>
      <p>Use one site’s order log, including open holds. Replay the approval check at each eligible request’s first release attempt. Count each request once and track buyer work through resolution. Match buyer time records and receipts to each need date. Price the same rule in the existing purchasing system.</p>
      <p>Fund a separately priced shadow pilot if an agent could reduce recurring work beyond the rule alone. Look for a credible path above {breakEvenMinutes} minutes saved per request against today’s buyer-led process under these costs. Agree who will use the freed hours and who can stop the pilot.</p>
    </section>
    <div className="case-choices" role="group" aria-label="Choose the site’s next step">
      {choices.map(item => <button type="button" key={item.id} aria-pressed={choice === item.id}
        onClick={() => setChoice(item.id)}>{item.label}</button>)}
    </div>
    <div className="choice-response" role="status" aria-atomic="true">
      <p>{choice ? responses[choice] : 'Which next step would you fund for orders like REQ-218?'}</p>
      {choice === 'buyer' && <p>For this {work.released ? 'release, record the minutes spent reconciling the supplier acknowledgment' : 'hold, record how much time the buyer spends tracing supply and resolving authority'}. Compare the measured time with the buyer-led baseline.</p>}
      {choice === 'rule' && <p>{work.released ? 'The rule would also release REQ-218 on fresh authority. Check whether the buyer still has to reconcile the same supplier terms.' : 'The rule would also hold REQ-218 on expired authority. Test whether it routes the exception early enough to cover Thursday’s need.'}</p>}
      {choice === 'pilot' && <p><strong>Your time assumption gives {netLabel(scenario.net)} in year-one capacity value.</strong> {scenario.net > 0 ? 'Use matched offline orders to test whether that surplus survives buyer review and rework.' : 'At this mix the assumed savings do not exceed costs. Seek stronger timing evidence or lower costs before funding.'} Include {work.released ? 'released orders like REQ-218 and time the acknowledgment check' : 'held orders like REQ-218 and time them through resolution'}. A later operating trial needs separate approval to verify actual capacity and on-time material.</p>}
    </div>
  </div>;
}
