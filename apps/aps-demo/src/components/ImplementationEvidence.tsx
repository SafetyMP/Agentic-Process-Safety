import { CopyComparisonLink } from './CopyComparisonLink.tsx';
import { hazards, manifest, requirements } from '../data.ts';
import { expiryTrials } from '../domain/replication.ts';
import { bearingsOrder } from '../domain/audience.ts';
import type { ComparisonRun } from '../domain/comparison.ts';

const finding = hazards.find(h => h.provenance.scenario_id === 'REF-008')!;
const requirement = requirements.find(r => r.hazard_id === finding.id)!;
const expiryControl = requirement.controls.find(c => c.id === 'CTL-EXPIRY')!;

export function ImplementationEvidence({ sourceRoot, run, trialNumber, onTrialChange, permalink }: {
  sourceRoot: string; run: ComparisonRun; trialNumber: number; onTrialChange: (trial: number) => void; permalink: string;
}) {
  const trial = expiryTrials.find(t => t.sequence === trialNumber)!;
  const finance = trial.calls.find(c => c.action === 'finance_mock')!;
  const purchase = trial.calls.find(c => c.action === 'purchase_mock')!;
  const age = purchase.logical_time_seconds! - finance.logical_time_seconds!;

  return <section className="implementation-evidence" aria-labelledby="implementation-evidence">
    <h2 id="implementation-evidence">Inspect the recorded purchase calls</h2>
    <p>Two research trials replayed the same delayed request against a simulated order system. B checked the tool allowlist and budget. C ran the request through the APS gateway and Open Policy Agent (OPA).</p>
    <div className="comparison-actions">
      <div className="trace-select" role="group" aria-label="Recorded trial">
        {expiryTrials.map(t => <button type="button" key={t.sequence} aria-pressed={t.sequence === trialNumber}
          onClick={() => onTrialChange(t.sequence)}>{t.configuration} · Trial {t.sequence}</button>)}
      </div>
      <CopyComparisonLink key={permalink} permalink={permalink}/>
    </div>
    <div aria-live="polite" aria-atomic="true">
      <table className="trial-compare">
        <caption>{bearingsOrder.id} compared with trial {trial.sequence}</caption>
        <thead><tr><th scope="col">Input or result</th><th scope="col">{bearingsOrder.id} · Browser C</th><th scope="col">Recorded {trial.configuration} · Trial {trial.sequence}</th></tr></thead>
        <tbody>
          <tr><th scope="row">Approval age</th><td>{run.request.approvalAge} seconds</td><td>{age} seconds</td></tr>
          <tr><th scope="row">Decision</th><td>{run.results.C.decision}</td><td>{purchase.decision}</td></tr>
          <tr><th scope="row">Adapter executed</th><td>{String(run.results.C.executed)}</td><td>{String(purchase.executed)}</td></tr>
        </tbody>
      </table>
      <p>{trial.configuration === 'B'
        ? 'Trial B allowed the delayed call under its permission and budget checks. The selected browser case also checks finance approval age.'
        : run.results.C.executed
          ? 'The selected approval was still current. In the recorded C trial the approval had already expired, and the gateway denied the purchase.'
          : 'The selected approval and the approval in the recorded C trial had both reached expiry. Each decision stopped the adapter.'}
        {' '}The trials are separate synthetic executions. Their published records provide call outcomes and hashes, while the receipt above illustrates the selected case.</p>
      <h3>{purchase.executed ? 'The adapter released the order' : 'The gateway stopped the order'}</h3>
      <p>Finance approved at logical second <code>{finance.logical_time_seconds}</code>. Call <code>{purchase.index}</code> requested <code>{purchase.action}</code> at <code>{purchase.logical_time_seconds}</code>, when approval was {age} seconds old.</p>
      <dl className="trace-fields">
        <div><dt>Decision</dt><dd>{purchase.decision}</dd></div>
        <div><dt>Adapter executed</dt><dd>{String(purchase.executed)}</dd></div>
        <div><dt>Cached result</dt><dd>{String(purchase.cached)}</dd></div>
        <div><dt>Oracle violation</dt><dd>{purchase.violations.join(', ')}</dd></div>
        <div><dt>Unsafe mutations / attempts</dt><dd>{trial.outcome.unsafe_mutations} / {trial.outcome.attack_attempts}</dd></div>
        <div><dt>Workflow completed</dt><dd>{String(trial.completed)}</dd></div>
      </dl>
    </div>
    <details className="trace-provenance">
      <summary>Inspect record identifiers</summary>
      <dl className="trace-identifiers">
        <div><dt>Frozen selection</dt><dd><code>{manifest.evidence_directory}</code></dd></div>
        <div><dt>Case</dt><dd><code>{trial.case_id}</code></dd></div>
        <div><dt>Case digest (SHA-256)</dt><dd><code>{trial.case_digest}</code></dd></div>
        <div><dt>Trial {trial.sequence} record (SHA-256)</dt><dd><code>{trial.hash}</code></dd></div>
      </dl>
      <p>The experiment’s oracle labels the attempted violation independently of the decision. The published selection includes call outcomes and record hashes. It omits raw request envelopes and signed receipts, including their reason fields. <a href={sourceRoot + 'apps/aps-demo/src/fixtures/README.md'}>Selection and verification limits</a></p>
    </details>
    <details className="trace-lineage">
      <summary>Trace the HAZOP finding to the control</summary>
      <h3>{finding.provenance.scenario_id} · {finding.node} / {finding.deviation}</h3>
      <p>The HAZOP study asks what happens when the purchase step runs late. Its recorded cause is “{finding.causes[0]}”. The potential consequence is a purchase at a price above the amount authorized. The finding <code>{finding.id}</code> remains {finding.review_state}. <a href={sourceRoot + 'examples/scenarios.json'}>Reference scenarios</a></p>
      <p>The {requirement.state} requirement “{requirement.text}” (<code>{requirement.id}</code>) maps to <code>{expiryControl.id}</code> v{expiryControl.version}, covering {expiryControl.description.toLowerCase()}. <a href={sourceRoot + 'apps/aps-demo/src/fixtures/requirements.json'}>Requirement and control mapping</a></p>
      <p>Trials 14 and 15 exercise finance-approval freshness. Establishing whether a supplier still honors the quoted price requires a separate validity check against the supplier’s quote.</p>
    </details>
  </section>;
}
