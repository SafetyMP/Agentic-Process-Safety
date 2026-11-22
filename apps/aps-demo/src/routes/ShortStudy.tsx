import { useState } from 'react';
import { ApprovalExhibit, ValueExhibit, DecisionExhibit } from '../components/CaseExhibits.tsx';
import type { useBearingsSelection } from '../components/useBearingsSelection.ts';
import { workspaceLink } from '../domain/workspaceLink.ts';
import { orderWork, valueScenarios } from '../domain/orderInvestment.ts';
import { getCase } from '../domain/cases.ts';
import { OrderJourney } from '../components/OrderJourney.tsx';
import { bearingsOrder, quoteAttempts } from '../domain/audience.ts';

const purchase = getCase('stale').preset;

export function ShortStudy({ order }: { order: ReturnType<typeof useBearingsSelection> }) {
  const [scenario, setScenario] = useState(valueScenarios[1]);
  const { run, setRun, quoteAttempt, setQuoteAttempt, available, setAvailable } = order;
  const work = orderWork(run, quoteAttempt, available);
  return <article className="case-story" aria-labelledby="case-opening">
    <header className="case-opening">
      <div>
        <p className="eyebrow">A purchasing case</p>
        <h1 id="case-opening" tabIndex={-1}>The bearings are due Thursday.</h1>
        <p>Finance has approved the purchase. The request is waiting for a software agent to send it to the supplier. What can change between approval and release?</p>
      </div>
      <dl className="case-order" aria-label="Purchase request">
        <div><dt>Material needed</dt><dd>24 bearings</dd></div>
        <div><dt>Needed for</dt><dd>Thursday assembly</dd></div>
        <div><dt>Order value</dt><dd>{purchase.amount} simulated spend units</dd></div>
      </dl>
    </header>

    <section className="case-chapter" aria-labelledby="case-workflow">
      <h2 id="case-workflow" tabIndex={-1}>How the bearings reach the line</h2>
      <p>Bearings support moving parts so they can turn smoothly. Thursday’s assembly run calls for 24. Today a buyer coordinates the purchase in the site’s enterprise resource planning (ERP) system, where planning, finance and receiving share the order record.</p>
      <ol className="case-process" aria-label="Buyer-led purchasing workflow">
        <li><strong>Plan the requirement</strong><span>The planner checks stock and incoming deliveries, then raises a requisition, an internal request to buy the shortfall.</span></li>
        <li><strong>Agree the terms</strong><span>A buyer obtains a supplier quote and a promised delivery date. Finance approves the spend against those terms.</span></li>
        <li><strong>Place the order</strong><span>The buyer sends the supplier a purchase order. This turns the internal request into a commitment to buy.</span></li>
        <li><strong>Receive the bearings</strong><span>Receiving counts the parts that arrive. The planner can then tell the crew whether Thursday’s job is covered.</span></li>
      </ol>
    </section>

    <section className="case-chapter" aria-labelledby="case-problem">
      <h2 id="case-problem" tabIndex={-1}>What changes while the request waits?</h2>
      <p>On Tuesday morning, North assembly has no bearings on hand for Thursday’s job. Now give the release step to an agent. It has the buyer’s earlier records. What will the buyer and the crew need to know if it sends the order late, or if the order stays on hold?</p>
      <OrderJourney available={available} onStockChange={setAvailable}/>
      <p className="case-baseline"><strong>How often does this happen today?</strong> Start with comparable buyer-led requests. Match attempted releases to approval expiry times, measure the time buyers spend resolving exceptions, and compare receipts and allocations with the assembly need date. Include requests still on hold.</p>
    </section>

    <section className="case-chapter" aria-labelledby="case-hazop">
      <h2 id="case-hazop" tabIndex={-1}>How HAZOP examines a late release</h2>
      <p>A hazard and operability study (HAZOP) is a structured team review developed in the chemical industry. A team chooses one process step, describes what it should accomplish and uses a guide word to ask how it could go wrong. It records causes, consequences and actions to follow up. <a href="https://webstore.iec.ch/en/publication/24321">IEC’s HAZOP guide</a></p>
      <div className="hazop-worksheet">
        <div className="hazop-question"><span>{bearingsOrder.id} · Guide word</span><strong>LATE</strong><p>What might expire before purchasing releases these {bearingsOrder.quantity} bearings for {bearingsOrder.needBy}?</p></div>
        <dl>
          <div><dt>Intended operation</dt><dd>Use quote {bearingsOrder.quote} while finance approval is current. The supplier offers Wednesday delivery if the order is placed by {bearingsOrder.quoteCutoff}, plant time.</dd></div>
          <div><dt>Cause and consequence</dt><dd>If the request waits past the cutoff, the supplier could ask for a higher price or offer a later delivery. REF-008 identifies the risk of committing above the authorized price.</dd></div>
          <div><dt>Proposed action</dt><dd>Expire old quotes in purchasing. Before an order goes out, the buyer verifies the price and delivery date the supplier will honor.</dd></div>
        </dl>
        <div className="quote-window">
          <p id="quote-time-prompt"><strong>When does {bearingsOrder.id} reach release?</strong> Try a plant time on either side of the quote cutoff.</p>
          <div role="group" aria-labelledby="quote-time-prompt" className="quote-times">
            <button type="button" aria-pressed={quoteAttempt === quoteAttempts[0]} onClick={() => setQuoteAttempt(quoteAttempts[0])}>{quoteAttempts[0].time}</button>
            <span>{bearingsOrder.quoteCutoff}<small>Quote expires</small></span>
            <button type="button" aria-pressed={quoteAttempt === quoteAttempts[1]} onClick={() => setQuoteAttempt(quoteAttempts[1])}>{quoteAttempts[1].time}</button>
          </div>
          <p className="quote-result" role="status" aria-atomic="true">{quoteAttempt.current
            ? 'Q-82 is current. Five minutes remain to place the order on the quoted terms.'
            : 'Q-82 has expired. Ask for a new price and delivery date before committing.'}</p>
        </div>
      </div>
      <p className="hazop-bridge">Keep that release time. Finance approval has its own clock, which starts when finance authorizes the spend. What happens if that authority expires while the request waits?</p>
    </section>

    <section className="case-chapter" aria-labelledby="case-evidence">
      <h2 id="case-evidence" tabIndex={-1}>One second changes the order</h2>
      <p>At the selected release time, APS checks the age of finance approval for {bearingsOrder.id}. In this model its lifetime is 60 logical seconds. Vary how long ago finance approved the request.</p>
      <ApprovalExhibit quoteAttempt={quoteAttempt} available={available} run={run} onRunChange={setRun}/>
      <a className="case-technical-link" href={workspaceLink(order)}>See how to implement the check</a>
    </section>

    <section className="case-chapter" aria-labelledby="case-decision">
      <h2 id="case-decision" tabIndex={-1}>Would an agent earn its place?</h2>
      <p>The existing purchasing system could recheck approval too. Follow the buyer’s work on {bearingsOrder.id} to see where an agent might free time and where the site still needs a person.</p>
      <ValueExhibit scenario={scenario} onChange={setScenario} work={work}/>
    </section>

    <section className="case-chapter" aria-labelledby="case-choice">
      <h2 id="case-choice" tabIndex={-1}>What would you do?</h2>
      <p>Use the bearings request to decide what to investigate next. The site’s investment decision depends on how often other buyers encounter the same work.</p>
      <DecisionExhibit scenario={scenario} work={work}/>
    </section>
  </article>;
}
