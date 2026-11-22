import { useEffect, useRef, useState } from 'react';
import { StudyDecision, useStudyDecisions } from '../components/StudyDecision.tsx';
import { hazards, routeLink } from '../data.ts';
import { getCase, presetDraft } from '../domain/cases.ts';
import { createComparison, type ComparisonRun } from '../domain/comparison.ts';
import { comparisonCsv, expiryTrials } from '../domain/replication.ts';
import { downloadText } from '../download.ts';

const purchasing = getCase('stale');
const quotation = hazards.find(hazard => hazard.provenance.scenario_id === 'REF-008')!;
const ages = [59, 60, 61] as const;
type Age = typeof ages[number];
const openingAge = 61;
const stops = ['The handoff', 'The LATE check', 'Your decision'] as const;

function release(result: ComparisonRun['results']['B']) {
  return result.executed ? 'Releases' : 'Holds';
}

function StudyReferences() {
  return <details className="study-references">
    <summary>Sources and full workspace</summary>
    <ul>
      <li><a href={routeLink('hazop', 'hazard', quotation.id)}>REF-008 source finding</a> · Unverified quotation-expiry hazard. Proposed safeguard: expire quotations.</li>
      <li><a href={routeLink('governance', 'control', purchasing.control)}>Approval freshness control</a> · Proposed requirement and implementation links</li>
      <li>Recorded stale-approval pair · {expiryTrials.map(trial =>
        <span key={trial.sequence}><a href={routeLink('assurance', 'trial', String(trial.sequence))}>{trial.configuration} trial {trial.sequence}</a>{' '}</span>
      )} · Separate synthetic executions</li>
      <li><a href="#/overview">Workspace overview</a> · <a href="#/simulator?story=stale&age=61">Open the full Case Lab</a></li>
      <li>
        <a href="#/simulator?story=stale&age=61&task=pilot">Pilot brief</a> ·{' '}
        <a href="#/simulator?story=stale&age=61&task=field">Shift handoff</a> ·{' '}
        <a href="#/simulator?story=stale&age=61&task=research">Research, teaching and full downloads</a>
      </li>
    </ul>
  </details>;
}

export function ShortStudy({ active }: { active: boolean }) {
  const decisions = useStudyDecisions();
  const [stop, setStop] = useState(0);
  const [prediction, setPrediction] = useState('');
  const [age, setAge] = useState<Age>(openingAge);
  const [runs, setRuns] = useState<Partial<Record<Age, ComparisonRun>>>({});
  const title = useRef<HTMLHeadingElement>(null);
  const resultTitle = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef(false);
  const run = runs[age];
  const revealed = !!runs[openingAge];

  useEffect(() => {
    if (pendingFocus.current) {
      pendingFocus.current = false;
      title.current?.focus();
    }
  }, [stop]);

  useEffect(() => {
    if (revealed) resultTitle.current?.focus();
  }, [revealed]);

  function go(next: number) {
    pendingFocus.current = true;
    setStop(next);
  }

  function evaluate(selectedAge: Age) {
    setAge(selectedAge);
    if (runs[selectedAge]) return;
    const result = createComparison(
      'study-' + selectedAge,
      { ...presetDraft('stale'), approvalAge: String(selectedAge) },
      { choice: '', rationale: prediction.trim() },
    );
    setRuns(previous => ({ ...previous, [selectedAge]: result }));
  }

  if (!active) return null;
  return <article className="short-study">
    <header className="study-intro">
      <p className="eyebrow">A short HAZOP study</p>
      <h1>Can this purchase go ahead?</h1>
      <p>Thursday’s assembly run needs 24 bearings. A purchase request for {purchasing.preset.amount} simulated spend units is ready to release.</p>
    </header>
    <ol className="study-stops" aria-label="Walkthrough progress">
      {stops.map((label, index) => <li key={label} aria-current={index === stop ? 'step' : undefined}>{index + 1}. {label}</li>)}
    </ol>
    <section className="panel study-panel" aria-labelledby="study-stop">
      <h2 id="study-stop" tabIndex={-1} ref={title}>{['How the request reaches purchase', 'What could happen if release is late?', 'Make one decision'][stop]}</h2>

      {stop === 0 && <>
        <div className="study-grid">
          <div><h3>Buyer-led ERP</h3><p>Planning flags the shortage. The enterprise resource planning (ERP) system can route approvals and release an order under configured rules. A buyer handles exceptions such as changed supplier terms.</p></div>
          <div><h3>Delegated ERP purchasing</h3><p>Software workers check the need, source a supplier and pass finance’s approval to a purchasing worker. That worker can act using evidence it inherited from earlier workers.</p></div>
        </div>
        <p>Either workflow can act on stale facts. With delegation, the next worker can release the order before a buyer sees what changed during the handoff. What should it recheck?</p>
        <button className="primary" onClick={() => go(1)}>Apply HAZOP at purchase</button>
      </>}

      {stop === 1 && <>
        <p>In a hazard and operability study (HAZOP), a guide word prompts the team to look for a departure from intent. Here the step is <strong>purchase</strong>, the intent is <strong>one currently authorized order</strong>, and the guide word is <strong>LATE</strong>.</p>
        {!revealed ? <form onSubmit={event => { event.preventDefault(); evaluate(openingAge); }}>
          <p>The order reaches release {openingAge} logical seconds after finance approved it. Both bundles receive the same agent request. B checks permission and spend. C adds checks including approval freshness.</p>
          <label>What could go stale while the request waits, and what do you predict will happen?
            <textarea value={prediction} onChange={event => setPrediction(event.target.value)} placeholder="Optional prediction or reflection"/>
          </label>
          <div className="button-row"><button type="button" onClick={() => go(0)}>Back</button><button className="primary">Reveal the comparison</button></div>
        </form> : <>
          <p><strong>{quotation.provenance.scenario_id} · Unverified hazard.</strong> The supplier quote could expire while the request waits. The order could then commit at a price beyond the authorized amount.</p>
          <p>The browser illustrates a related check on <strong>finance approval</strong>. B and C evaluate the same agent request and starting state. B checks permission and spend. C adds fixed checks, including approval freshness. Even with current finance approval, quote validity, stock and purchase need still require their own checks.</p>
          {prediction.trim() && <details><summary>Your prediction</summary><p className="study-response">{prediction}</p></details>}
          <div className="button-row" role="group" aria-label="Test an approval age in logical seconds">
            {ages.map(value => <button key={value} aria-pressed={age === value} onClick={() => evaluate(value)}>{value} seconds</button>)}
          </div>
          {run && <div className="study-result" role="status">
            <h3 ref={resultTitle} tabIndex={-1}>Release at {run.request.approvalAge} logical seconds</h3>
            <p><strong>B {release(run.results.B).toLowerCase()}.</strong> Permission and spend checks pass{run.results.B.executedViolations.length ? ' even though finance approval has expired' : ''}. {run.results.B.effect?.after.orders} modeled order, {run.results.B.effect?.after.spend} simulated spend units.</p>
            <p><strong>C {release(run.results.C).toLowerCase()}.</strong> {run.results.C.executed
              ? 'Finance approval is still current.'
              : 'Finance approval has expired. The purchase is still outstanding.'} {run.results.C.effect?.after.orders} modeled {run.results.C.executed ? 'order' : 'orders'}, {run.results.C.effect?.after.spend} simulated spend units.</p>
            <p>Approval is current below 60 logical seconds. It expires at 60.</p>
          </div>}
          <div className="button-row"><button onClick={() => go(0)}>Back</button><button className="primary" onClick={() => go(2)}>Choose your decision</button></div>
        </>}
      </>}

      {stop === 2 && run && <div>
        <StudyDecision run={run} drafts={decisions} retainedRuns={Object.values(runs)} onSelectRun={selected => {
          const retainedAge = ages.find(value => runs[value] === selected);
          if (retainedAge === undefined) return;
          setAge(retainedAge);
          title.current?.focus();
        }}/>
        <div className="button-row"><button onClick={() => go(1)}>Back to comparison</button></div>
      </div>}
    </section>
    {revealed && <>
      <details className="study-references">
        <summary>Timing data from this study</summary>
        <table><caption>Modeled orders for evaluated requests</caption>
          <thead><tr><th scope="col">Age (logical seconds)</th><th scope="col">B orders</th><th scope="col">C orders</th></tr></thead>
          <tbody>{Object.values(runs).map(item => <tr key={item.id}><th scope="row">{item.request.approvalAge}</th><td>{item.results.B.effect?.after.orders}</td><td>{item.results.C.effect?.after.orders}</td></tr>)}</tbody>
        </table>
        <div className="button-row"><button onClick={() => downloadText(comparisonCsv(Object.values(runs)), 'aps-short-study-timing.csv', 'text/csv;charset=utf-8')}>Download evaluated timing data</button><a href="#/simulator?task=learner">Open the learner prediction exercise</a></div>
      </details>
      <StudyReferences/>
    </>}
  </article>;
}
