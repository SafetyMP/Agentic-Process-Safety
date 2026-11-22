import { useEffect, useRef, useState } from 'react';
import { studyRoles, StudyDecision, useStudyDecisions } from '../components/StudyDecision.tsx';
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
const stops = ['Frame the case', 'Test one order', 'Make a recommendation'] as const;

function release(result: ComparisonRun['results']['B']) {
  return result.executed ? 'Releases' : 'Holds';
}

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });

function estimatedNetValue(minutes: string): string | null {
  const minutesSaved = Number(minutes);
  const monthlyCapacityValue = 200 * minutesSaved / 60 * 40;
  const yearOneValue = 12 * (monthlyCapacityValue - 400) - 2400;
  const valid = minutes.trim() !== '' && minutesSaved >= 0 && Number.isFinite(yearOneValue);
  return valid ? currency.format(yearOneValue) : null;
}

function CaseOptions({ minutes, netValue, onMinutesChange }: { minutes: string; netValue: string | null; onMinutesChange: (value: string) => void }) {
  return <details className="study-references case-options">
    <summary>Compare the options and costs</summary>
    <dl>
      <dt>Keep buyer-led purchasing</dt><dd>Buyers use the enterprise resource planning system (ERP) to route orders and resolve exceptions. Measure their time and whether material arrives by the need date.</dd>
      <dt>Change the ERP rule</dt><dd>Try checking finance approval again at release. Estimate configuration and support costs. A buyer still handles a held order.</dd>
      <dt>Test an agent alongside buyers</dt><dd>For four weeks at one site, compare the agent’s recommendations with buyer decisions on the same requests. Buyers alone release orders.</dd>
    </dl>
    <h3>What would make the agent worth its cost?</h3>
    <p>Suppose a future rollout saves 6 buyer minutes per request, including time spent resolving holds. At 200 requests a month and $40 per hour, that frees $800 of buyer time each month.</p>
    <p><strong>$2,400 in year-one net value</strong> = 12 × ($800 in time freed − $400 in monthly running costs) − $2,400 for setup. This counts capacity the site can put to use. Cash savings would require a change in actual spending.</p>
    <p>The break-even point is <strong>4.5 minutes per request</strong>. At 3 minutes, the site loses $2,400 of value in year one. Try a different assumption about a future rollout below.</p>
    <label htmlFor="pilot-minutes">Minutes saved per request</label>
    <input id="pilot-minutes" type="number" min="0" step="any" value={minutes}
      onChange={event => onMinutesChange(event.target.value)}/>
    <p><output htmlFor="pilot-minutes" aria-live="polite">{netValue !== null
      ? `Estimated first-year net capacity value: ${netValue}.`
      : 'Enter a nonnegative number of minutes to estimate first-year value.'}</output></p>
    <h3>What would justify a live trial?</h3>
    <p>During the shadow pilot, compare buyer decisions with agent and ERP-rule recommendations. Log disagreements, review time and unresolved holds. Pause for finance review if the agent recommends release with expired approval.</p>
    <p>To estimate time savings, have buyers time matched requests offline with and without agent assistance, including exception handling. At week four, use those estimates and the cost of the ERP alternative to decide whether to seek approval for a live trial. In that trial, verify actual buyer time saved and the share of requirements covered by their need date before expanding.</p>
  </details>;
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

export function TechnicalStudy({ active }: { active: boolean }) {
  const decisions = useStudyDecisions();
  const [stop, setStop] = useState(0);
  const [minutes, setMinutes] = useState('6');
  const netValue = estimatedNetValue(minutes);
  const capacityBasis = netValue === null ? null
    : `${Number(minutes)} minutes saved per request gives ${netValue} in estimated first-year net capacity value.`;
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

  function observe(selectedAge: Age) {
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
      <p className="eyebrow">Supply chain business case</p>
      <h1>Should this site pilot a purchasing agent?</h1>
      {stop === 0 && <p>Thursday’s assembly run needs 24 bearings. A software agent could help buyers place orders faster. What happens if finance’s approval expires while a request waits?</p>}
    </header>
    <ol className="study-stops" aria-label="Walkthrough progress">
      {stops.map((label, index) => <li key={label} aria-current={index === stop ? 'step' : undefined}>{index + 1}. {label}</li>)}
    </ol>
    <section className="panel study-panel" aria-labelledby="study-stop">
      <h2 id="study-stop" tabIndex={-1} ref={title}>{['How should the site test the idea?', 'What could happen if release is late?', 'Make one decision'][stop]}</h2>

      {stop === 0 && <>
        <p>In a four-week shadow pilot, the agent would recommend orders while buyers keep release authority. Use a hazard and operability study (HAZOP) to weigh the benefit of catching an expired approval against the buyer’s work to resolve a hold before Thursday.</p>
        <CaseOptions minutes={minutes} netValue={netValue} onMinutesChange={setMinutes}/>
        <div className="study-role-options" role="group" aria-label="Explore the case in your role">
          {studyRoles.map(({ id, label, task }) => <div key={id}>
            <button onClick={() => { decisions.setRole(id); go(1); }}>{label}</button>
            <p>{task}</p>
          </div>)}
        </div>
      </>}

      {stop === 1 && <>
        <p>Apply the HAZOP guide word <strong>LATE</strong> to release. A purchasing agent receives a request for {purchasing.preset.amount} simulated spend units with an earlier finance approval. The site needs one authorized order in time for Thursday.</p>
        <details className="study-references"><summary>How APS tests the handoff</summary><p>Agentic Process Safety (APS) examines what still needs to be true when an agent acts. In a hazard and operability study (HAZOP), a guide word helps a team question a process step. Here the word is LATE. A purchasing worker may rely on information inherited from planning, sourcing and finance.</p></details>
        {!revealed ? <form onSubmit={event => { event.preventDefault(); observe(openingAge); }}>
          <p>The request reaches release {openingAge} logical seconds after approval. Try it with two sets of rules. B checks permission and spend. C also checks whether approval is current.</p>
          <label>What could go stale while the request waits, and what do you predict will happen?
            <textarea value={prediction} onChange={event => setPrediction(event.target.value)} placeholder="Optional prediction or reflection"/>
          </label>
          <div className="button-row"><button type="button" onClick={() => go(0)}>Back</button><button className="primary">Reveal the comparison</button></div>
        </form> : <>
          <p>B and C evaluate the same request and starting state. Check when finance approval changes the decision.</p>
          {prediction.trim() && <details><summary>Your prediction</summary><p className="study-response">{prediction}</p></details>}
          <div className="button-row" role="group" aria-label="Test an approval age in logical seconds">
            {ages.map(value => <button key={value} aria-pressed={age === value} onClick={() => { setAge(value); observe(value); }}>{value} seconds</button>)}
          </div>
          {run && <div className="study-result" role="status">
            <h3 ref={resultTitle} tabIndex={-1}>Release at {run.request.approvalAge} logical seconds</h3>
            <p><strong>B {release(run.results.B).toLowerCase()}.</strong> Permission and spend checks pass{run.results.B.executedViolations.length ? ' even though finance approval has expired' : ''}. {run.results.B.effect?.after.orders} modeled order, {run.results.B.effect?.after.spend} simulated spend units.</p>
            <p><strong>C {release(run.results.C).toLowerCase()}.</strong> {run.results.C.executed
              ? 'Finance approval is still current.'
              : 'Finance approval has expired. The purchase is still outstanding.'} {run.results.C.effect?.after.orders} modeled {run.results.C.executed ? 'order' : 'orders'}, {run.results.C.effect?.after.spend} simulated spend units.</p>
            <p>Approval is current below 60 logical seconds. It expires at 60.</p>
          </div>}
          <details className="study-references"><summary>What else needs checking?</summary>
            <p><strong>{quotation.provenance.scenario_id} · Unverified hazard.</strong> The supplier quote could expire while the request waits. A buyer could commit above the authorized price. This model checks finance approval. Quote validity, stock and the need for the order require separate evidence.</p>
          </details>
          <div className="button-row"><button onClick={() => go(0)}>Back</button><button className="primary" onClick={() => go(2)}>Choose your decision</button></div>
        </>}
      </>}

      {stop === 2 && run && <div>
        <CaseOptions minutes={minutes} netValue={netValue} onMinutesChange={setMinutes}/>
        <StudyDecision run={run} drafts={decisions} capacityBasis={capacityBasis} retainedRuns={Object.values(runs)} onTestBoundary={observe} onSelectRun={selected => {
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
