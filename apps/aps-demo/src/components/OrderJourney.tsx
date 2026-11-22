import { bearingsOrder } from '../domain/audience.ts';

const bearingsNeeded = bearingsOrder.quantity;

export function OrderJourney({ available, onStockChange }: {
  available: number | null; onStockChange: (count: number | null) => void;
}) {
  const coverage = available === null ? 'unknown' : available === 0 ? 'short' : 'covered';

  return <figure className="order-journey" aria-labelledby="journey-caption">
    <figcaption id="journey-caption">Follow {bearingsOrder.id} from approval to assembly</figcaption>
    <ol className="journey-origin" aria-label="Before release">
      <li><strong>Finance approves</strong><span>The buyer has supplier quote {bearingsOrder.quote} for {bearingsNeeded} bearings. Finance authorizes the spend.</span></li>
      <li><strong>The request waits</strong><span>Purchasing has yet to send the order. The quote, approval or stock position can change.</span></li>
    </ol>
    <div className="journey-fork" aria-hidden="true"/>
    <div className="journey-paths">
      <section className="journey-path" aria-labelledby="late-path">
        <h3 id="late-path" tabIndex={-1}>If the order goes out</h3>
        <p>The supplier receives a late purchase order.</p>
        <dl>
          <div><dt>Buyer</dt><dd>Check what the supplier accepted. If its price changed or finance approval expired, resolve the commitment with finance.</dd></div>
          <div><dt>Assembly line</dt><dd>The planner has an order to track. Until receiving counts the parts, a promised delivery can still miss Thursday’s run.</dd></div>
        </dl>
      </section>
      <section className="journey-path" aria-labelledby="hold-path">
        <h3 id="hold-path" tabIndex={-1}>If the order waits</h3>
        <p>The request is on hold. No new order reaches the supplier.</p>
        <dl>
          <div><dt>Buyer</dt><dd>Look for an existing delivery. If the site is still short, confirm the quote and obtain fresh authority before the supplier cutoff.</dd></div>
          <div><dt>Assembly line</dt><dd>An earlier shipment could cover the job. If it falls short, the planner needs another source or a different assembly slot.</dd></div>
        </dl>
      </section>
    </div>
    <div className="journey-fork journey-join" aria-hidden="true"/>
    <section className="assembly-check" aria-labelledby="assembly-count">
      <div className="assembly-question">
        <span className="assembly-time">Thursday · 08:00</span>
        <h3 id="assembly-count" tabIndex={-1}>Can assembly start with all 24?</h3>
        <p>Follow either path to receiving. Try two possible stock records for bearings on hand and allocated to this run.</p>
        <div className="stock-choices" role="group" aria-label="Illustrative Thursday stock record">
          {[0, bearingsNeeded].map(count => <button key={count} type="button" aria-pressed={available === count}
            onClick={() => onStockChange(available === count ? null : count)}>{count === 0 ? 'No bearings available' : '24 bearings available'}</button>)}
        </div>
      </div>
      <div className="assembly-tray" data-coverage={coverage}>
        <div className="bearing-slots" aria-hidden="true">
          {Array.from({ length: bearingsNeeded }, (_, index) => <span key={index}/>)}
        </div>
        <div className="assembly-reading" role="status" aria-atomic="true">
          <strong>{available === null ? 'Availability unknown' : available + ' of ' + bearingsNeeded + ' bearings available'}</strong>
          <span>{available === null ? 'The order status alone cannot tell the crew what is in the parts bin.'
            : available === 0 ? 'These parts cannot be issued. The planner must find stock or move the job.'
            : 'Receiving can issue the full set. The buyer can reconcile any open order to avoid buying twice.'}</span>
        </div>
      </div>
    </section>
  </figure>;
}
