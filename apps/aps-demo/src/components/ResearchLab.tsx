import { useSession } from './SessionContext.tsx';
import { buildLabel } from '../domain/audience.ts';
import { MODEL_VERSION } from '../domain/comparison.ts';
import { comparisonCsv, expiryTrials, fieldProtocol, instructorKit, recordedCsv, studentSheet } from '../domain/replication.ts';
import { manifest } from '../data.ts';
import { downloadText } from '../download.ts';

export function LearnerSheet() {
  return <section className="panel"><h1>Predict the purchase decision</h1><p>Finance has approved a purchase for 300 simulated spend units. B checks tool permission and the spend limit. C also requires approval age below 60 logical seconds.</p>
    <ol><li>Predict whether each bundle will place an order at 59, 60 and 61 seconds. Explain your reasoning before running the case.</li><li>Record the order counts and comparison IDs. Which inputs stayed fixed?</li><li>Use your assigned purchasing update. Hand your proposed action to another team, and ask what evidence would change it.</li></ol>
    <div className="button-row"><button onClick={() => downloadText(studentSheet,'aps-learner-sheet.md')}>Download blank learner sheet</button><a className="button primary" href="#/simulator?story=stale&age=61&task=field">Start the purchasing exercise →</a></div></section>;
}
export function ResearchLab() {
  const { runs, draft, prepareExpiry } = useSession();
  const boundary = runs.filter(run => run.caseId === 'stale' && !run.parent);
  return <><h3>Reproduce and teach the approval boundary</h3>
    {draft.caseId !== 'stale' && <p><a onClick={prepareExpiry} href="#/simulator?story=stale&age=61&task=research">Prepare the approval-boundary exercise →</a></p>}
    <p>Run 59, 60 and 61 seconds with the amount and starting state held fixed. B and C evaluate the same request. Each row below identifies one retained evaluation of fixed rules. Repeating an input adds no new sampled requisition.</p>
    <div className="table-scroll"><table><caption>Your retained expiry comparisons</caption><thead><tr><th>Run</th><th>Age (logical seconds)</th><th>B orders</th><th>C orders</th></tr></thead><tbody>{boundary.map(run => <tr key={run.id}><th>{run.id}</th><td>{run.request.approvalAge}</td><td>{run.results.B.effect?.after.orders}</td><td>{run.results.C.effect?.after.orders}</td></tr>)}</tbody></table></div>
    <div className="button-row"><button disabled={!boundary.length} onClick={() => downloadText(comparisonCsv(boundary),'aps-browser-expiry.csv','text/csv;charset=utf-8')}>Download browser comparison CSV</button><button onClick={() => downloadText(recordedCsv(),'aps-recorded-expiry.csv','text/csv;charset=utf-8')}>Download recorded pair CSV</button></div>
    <details><summary>Replication instructions and variable dictionary</summary>
      <p>Build <code>{buildLabel}</code> · model <code>{MODEL_VERSION}</code> · frozen selection <code>{manifest.evidence_directory}</code>. Match the revision and browser source fingerprint when reproducing a local build. Older saved runs can have an unrecorded build.</p>
      <p>Expected browser order counts at 59, 60 and 61 seconds are B (1, 1, 1) and C (1, 0, 0). In the separate recorded stale-approval pair, inspect {expiryTrials.map(t => <span key={t.sequence}><a href={'#/assurance?trial=' + t.sequence}>{t.configuration} trial {t.sequence}</a>{' '}</span>)}. Compare their executed flags and violations.</p>
      <p>From the matching checkout with Node 22.18+, run <code>npm run demo:fixtures:check</code>. Expect nine snapshot hashes and 30 trial records to pass. Inspect <code>apps/aps-demo/src/fixtures/manifest.json</code> for selectors and hashes. To collect fresh gateway evidence, follow the Python/OPA setup in <code>docs/PHASE3_OPERATIONS.md</code> and run <code>bash scripts/verify-phase3.sh</code>.</p>
      <dl><dt>Browser rows</dt><dd>One row per run and bundle. Run and request IDs are local to an exported session. Baseline is the starting order count and spend. Age is logical seconds. Amount is simulated spend. Orders after evaluation is a count. A blank parent identifies an original comparison.</dd><dt>Recorded rows</dt><dd>One row per frozen trial. Case ID and digest pair the bundles. Sequence and SHA256 locate the record. Attack calls is the denominator for unsafe mutations. Completed is the recorded task outcome. The two files share a fault family, not an event identity.</dd></dl>
    </details>
    <details><summary>Plan a field comparison</summary><p>Define one requisition, a common policy, a buyer-led ERP comparator, a measurement window and the treatment of unresolved holds.</p><button onClick={() => downloadText(fieldProtocol,'aps-field-study.md')}>Download field-study worksheet</button></details>
    <details><summary>Teach the case</summary><p>Allow 20 minutes for prediction, comparison, a shift handoff and a debrief. Share the learner link before opening the answer key.</p><div className="button-row"><a className="button" href="#/simulator?task=learner">Open learner task</a><button onClick={() => downloadText(studentSheet,'aps-learner-sheet.md')}>Download learner worksheet</button><button onClick={() => downloadText(instructorKit,'aps-instructor-guide.md')}>Download instructor guide and rubric</button></div></details></>;
}
