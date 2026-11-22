import { bearingsOrder } from '../domain/audience.ts';
import type { BearingsSelection } from '../domain/workspaceLink.ts';

const rule = 'deny contains "approval_invalid" if { input.action == "purchase_mock"; not input.approval_ok }';

export function SelectedPurchaseTrace({ order, sourceRoot }: { order: BearingsSelection; sourceRoot: string }) {
  const { run, quoteAttempt, available } = order;
  const result = run.results.C;
  const freshness = result.checks.find(check => check.rule === 'Approval freshness')!;
  const effect = result.effect!;
  const exampleRequest = {
    request_id: run.id, nonce: run.requestIdentity, idempotency_key: 'bearings-order-218',
    actor: run.request.actor, task_id: bearingsOrder.id, resource: 'procurement:' + bearingsOrder.id,
    action: 'purchase_mock', state_version: 4, delegation_depth: run.request.depth,
    context_id: 'example-context', payload: { value: 0, target: '' },
  };
  // Show the corresponding gateway field values for an otherwise eligible, new purchase.
  const receiptExcerpt = {
    task_id: exampleRequest.task_id, action: exampleRequest.action, decision: result.decision,
    reason: result.executed ? 'policy_allow' : 'approval_invalid', executed: result.executed, cached: false,
  };

  return <section className="selected-trace" aria-labelledby="selected-trace-title">
    <h2 id="selected-trace-title">Trace {bearingsOrder.id} through APS</h2>
    <p><strong>{result.executed ? 'Released' : 'Held'} at {quoteAttempt.time}.</strong> The buyer needs {bearingsOrder.quantity} bearings for {bearingsOrder.needBy}.
      {' '}{bearingsOrder.quote} is {quoteAttempt.current ? 'current' : 'expired'}. {available === null ? 'Thursday stock is unknown.' : `The selected Thursday record shows ${available} of ${bearingsOrder.quantity} available.`}
      {' '}The buyer verifies supplier terms and stock separately. <a href="#/study?section=case-evidence">Change the release timing</a></p>
    <ol className="purchase-stages" aria-label="Selected purchase trace">
      <li>
        <h3>Request</h3>
        <p>Actor <code>{exampleRequest.actor}</code> requests <code>{exampleRequest.action}</code> for <code>{exampleRequest.task_id}</code>. The approved purchase is worth {run.request.amount} simulated spend units.</p>
        <p>Request ID <code>{exampleRequest.request_id}</code></p>
      </li>
      <li>
        <h3>Policy check</h3>
        <p>At admission, approval is <strong>{run.request.approvalAge} seconds</strong> old. The model requires age below 60 seconds.</p>
        <p className="freshness-result"><code>{run.request.approvalAge} &lt; 60</code><strong>{freshness.status}</strong></p>
        <p>{result.executed ? 'All modeled checks pass. The adapter places one order.' : 'Finance approval has expired. APS stops the call before the adapter executes.'}</p>
      </li>
      <li>
        <h3>Illustrative receipt</h3>
        <p>Expected gateway fields for this first attempt, shown as an unsigned excerpt.</p>
        <pre className="selected-receipt"><code>{JSON.stringify(receiptExcerpt, null, 2)}</code></pre>
        <p><strong>Orders</strong> {effect.before.orders} → {effect.after.orders} · <strong>Spend</strong> {effect.before.spend} → {effect.after.spend} units</p>
      </li>
    </ol>
    <details className="implementation-contract">
      <summary>Inspect the request and policy contract</summary>
      <h4>What the caller supplies</h4>
      <p>This example maps the selected case to the request schema using illustrative envelope identifiers. The gateway obtains the approved amount and supplier from stored task state. <a href={sourceRoot + 'schemas/governance-request.schema.json'}>Request schema</a></p>
      <pre><code>{JSON.stringify(exampleRequest, null, 2)}</code></pre>
      <h4>What the gateway verifies</h4>
      <p>For a new purchase, <code>purchase_binding</code> hashes the actor, task, resource, action, quantity, supplier, amount, state version, context and active policy digest. The stored approval must match that binding and policy digest, remain unused and satisfy <code>approval['expires'] &gt; now</code> at admission. Finance sets expiry to the earlier of the task expiry and approval time plus 60 seconds. <a href={sourceRoot + 'policies/v1/config.json'}>Policy configuration</a></p>
      <p>OPA evaluates this Rego rule using the gateway’s verified <code>approval_ok</code> value. The policy also denies a purchase when the approver and purchasing actor are the same. <a href={sourceRoot + 'policies/v1/procurement.rego'}>Rego source</a></p>
      <pre><code>{rule}</code></pre>
      <h4>What commits</h4>
      <p>On a new allowed purchase, the gateway runs the simulated adapter, consumes the approval, stores the idempotent result and appends a signed receipt in one SQLite transaction. A denied purchase records a receipt and leaves the order, spend and approval unchanged. <a href={sourceRoot + 'docs/GOVERNANCE_ARCHITECTURE.md#request-to-effect-protocol'}>Transaction protocol</a></p>
      <p>For a retry with a fresh nonce, the gateway looks up the idempotency key by task and actor. It checks the request fingerprint and policy digest before it can return a cached result. A cached purchase with an expired approval returns <code>approval_expired</code>.</p>
      <p>The receipt binds the request hash and policy digest to the decision, reason, execution and cache flags, and result hash. <code>verify_receipts</code> checks signatures, signing-key identity, sequence and previous-receipt hashes. <a href={sourceRoot + 'schemas/authorization-receipt.schema.json'}>Receipt schema</a></p>
    </details>
  </section>;
}
