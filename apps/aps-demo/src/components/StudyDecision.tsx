import { useEffect, useRef, useState, type FormEvent } from 'react';
import { eligibleUpdates, fieldUpdates, requisition, type UpdateId } from '../domain/audience.ts';
import type { ComparisonRun } from '../domain/comparison.ts';
import { ShortShiftHandoff } from './ShortShiftHandoff.tsx';

export const studyRoles = [
  { id: 'pilot', label: 'Supply chain executive', task: 'Decide whether to fund a pilot.' },
  { id: 'field', label: 'Site line manager', task: 'Prepare the next shift’s response to a held order.' },
  { id: 'research', label: 'Researcher or professor', task: 'Test an approval rule and build a classroom exercise.' },
] as const;
const pilotQuestions: Record<string, readonly string[]> = {
  'Sponsor a shadow pilot': ['Stop condition', 'Who can pause the pilot?', 'Reason for your recommendation'],
  'Test the ERP rule first': ['Who will test the rule?', 'What result would justify keeping it?', 'Reason for your recommendation'],
  'Defer pending evidence': ['Missing evidence', 'Who will collect it?', 'Reason for your recommendation'],
  'Keep the current workflow': ['Reason to keep the current workflow', 'What would prompt reconsideration?'],
};
const dispositions = ['Reconcile and propose closing the requisition', 'Seek current authorization and recheck the quote', 'Keep open and escalate for review'];
const fieldQuestions = ['Evidence supporting the disposition', 'Action owner', 'Deadline'];
const researchQuestions = ['Explain the 59/60-second boundary in your own words', 'One limit or field observation to collect', 'Which pilot assumption should students challenge, and how?'];
const boundaryAges = [59, 60] as const;
type BoundaryAge = typeof boundaryAges[number];
type Role = typeof studyRoles[number]['id'];
type Decision = { choice: string; responses: Record<string, string[]>; submitted: boolean; capacityBasis?: string | null };
const blank: Decision = { choice: '', responses: {}, submitted: false };

export function useStudyDecisions() {
  const [role, setRole] = useState<Role | ''>('');
  const [update, setUpdate] = useState<UpdateId>('inbound');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  return { role, setRole, update, setUpdate, decisions, setDecisions };
}

function BoundaryEvidence({ observations, onTest }: {
  observations: (ComparisonRun | undefined)[];
  onTest: (age: BoundaryAge) => void;
}) {
  const missing = boundaryAges.find((_, index) => !observations[index]);
  const next = useRef<HTMLButtonElement>(null);
  const tested = useRef(false);
  useEffect(() => {
    if (tested.current) {
      tested.current = false;
      if (missing) next.current?.focus();
      else document.getElementById('study-answer-0')?.focus();
    }
  }, [missing]);

  return <div className="study-update">
    <h3>Teach the decision</h3>
    <p>Have students predict the release decision, hold the request fixed, then test 59 and 60 logical seconds. Ask them to explain the difference and identify the field evidence needed to defend a pilot recommendation.</p>
    <table><caption>Observed decisions for the same request</caption>
      <thead><tr><th scope="col">Approval age</th><th scope="col">B</th><th scope="col">C</th></tr></thead>
      <tbody>{boundaryAges.map((age, index) => {
        const run = observations[index];
        return <tr key={age}><th scope="row">{age} seconds</th>
          {run ? (['B', 'C'] as const).map(mode => <td key={mode}>{run.results[mode].executed ? 'Released' : 'Held'}</td>) : <td colSpan={2}>Awaiting evaluation</td>}
        </tr>;
      })}</tbody>
    </table>
    {missing && <button className="primary" ref={next} onClick={() => { tested.current = true; onTest(missing); }}>Test {missing} seconds</button>}
  </div>;
}

export function StudyDecision({ run, retainedRuns, onSelectRun, onTestBoundary, drafts, capacityBasis }: {
  run: ComparisonRun;
  retainedRuns: ComparisonRun[];
  onSelectRun: (run: ComparisonRun) => void;
  onTestBoundary: (age: BoundaryAge) => void;
  drafts: ReturnType<typeof useStudyDecisions>;
  capacityBasis: string | null;
}) {
  const { role, setRole, update, setUpdate, decisions, setDecisions } = drafts;
  const summary = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  const updates = eligibleUpdates(run);
  const fieldUnavailable = role === 'field' && !updates.includes(update);
  const observations = boundaryAges.map(age => retainedRuns.find(item => item.request.approvalAge === age));
  const pairReady = observations.every(item => item !== undefined);
  const key = role === 'research' ? 'research/' + observations.map(item => item?.id ?? '').join('/')
    : run.id + '/' + role + (role === 'field' ? '/' + update : '');
  const decision = decisions[key] ?? blank;
  const answers = decision.responses[decision.choice] ?? [];
  const questions = role === 'pilot' ? pilotQuestions[decision.choice] ?? [] : role === 'field' ? fieldQuestions : researchQuestions;
  const options = role === 'pilot' ? Object.keys(pilotQuestions) : dispositions;
  const canDecide = !!role && !fieldUnavailable && (role !== 'research' || pairReady);
  const missingCost = role === 'pilot' && capacityBasis === null;

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    if (decision.submitted) summary.current?.focus();
    else document.getElementById(role === 'research' ? 'study-answer-0' : 'study-choice')?.focus();
  }, [decision.submitted, role]);

  function save(next: Decision) {
    setDecisions(previous => ({ ...previous, [key]: next }));
  }
  function saveAnswers(values: string[], submitted = false) {
    save({ ...decision, responses: { ...decision.responses, [decision.choice]: values }, submitted,
      capacityBasis: submitted && role === 'pilot' ? capacityBasis : null });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canDecide || missingCost || (role !== 'research' && !decision.choice) || !questions.every((_, index) => answers[index]?.trim())) return;
    moveFocus.current = true;
    saveAnswers(answers.map(value => value.trim()), true);
  }

  return <div className="study-decision">
    {role !== 'research' && <p className="study-basis">Decision basis · {run.request.approvalAge} logical seconds · B {run.results.B.executed ? 'released' : 'held'}, C {run.results.C.executed ? 'released' : 'held'}. Proposals are kept in this visit for the selected comparison.</p>}
    <label><span id="study-role-label">Choose your role</span>
      <select aria-labelledby="study-role-label" value={role} onChange={event => setRole(event.target.value as Role | '')}>
        <option value="">Select an audience</option>
        {studyRoles.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
    </label>
    {fieldUnavailable && <div>
      <p>Bundle C released the modeled order. This exercise starts from a run where C held the order. Select a retained hold to continue.</p>
      <div className="button-row">
        {retainedRuns.filter(item => eligibleUpdates(item).length > 0).map(item =>
          <button key={item.id} onClick={() => onSelectRun(item)}>Return to the {item.request.approvalAge}-second hold</button>
        )}
      </div>
    </div>}
    {role === 'pilot' && <p>Would you fund the four-week shadow pilot? Use a cost assumption or a delivery trade-off to explain your recommendation. Consider what the simpler ERP rule could achieve.</p>}
    {role === 'field' && !fieldUnavailable && <div className="study-update">
      <p>C held the order. The site still needs 24 bearings by Thursday. Read the update and leave the next shift an action, an owner and a deadline.</p>
      <label><span id="study-update-label">Fictional purchasing update</span>
        <select aria-labelledby="study-update-label" value={update} onChange={event => setUpdate(event.target.value as UpdateId)}>
          {updates.map(id => <option key={id} value={id}>{fieldUpdates[id].title}</option>)}
        </select>
      </label>
      <p>{requisition}</p>
      <p>{fieldUpdates[update].record}</p>
      <p>Before any further release, reconcile prior orders and confirm current authority.</p>
    </div>}
    {role === 'research' && <BoundaryEvidence observations={observations} onTest={onTestBoundary}/>}
    {canDecide && (decision.submitted ? <div className="study-result">
      <h3 ref={summary} tabIndex={-1}>Decision recorded for discussion</h3>
      {decision.capacityBasis && <p><strong>Assumption at submission</strong> · {decision.capacityBasis}</p>}
      {decision.choice && <p className="study-response"><strong>{decision.choice}</strong>{role === 'field' && ` · ${fieldUpdates[update].title}. C held the order at ${run.request.approvalAge} logical seconds and placed no order.`}</p>}
      <dl>{questions.map((label, index) => <div key={label}><dt>{label}</dt><dd className="study-response">{answers[index]}</dd></div>)}</dl>
      <p>{role === 'research' ? 'Interpretation of the two observed browser comparisons for discussion.' : 'This proposal grants no purchasing or pilot authority.'}</p>
      {role === 'field' && <ShortShiftHandoff key={key} run={run} update={update} disposition={decision.choice} evidence={answers[0]} owner={answers[1]} deadline={answers[2]}/>}
      <button onClick={() => { moveFocus.current = true; save({ ...decision, submitted: false }); }}>Revise decision</button>
    </div> : <form className="study-form" key={key} onSubmit={submit}>
      {role !== 'research' && <label><span id="study-choice-label">{role === 'pilot' ? 'Sponsor decision' : 'Proposed disposition'}</span>
        <select id="study-choice" aria-labelledby="study-choice-label" required value={decision.choice} onChange={event => save({ ...decision, choice: event.target.value })}>
          <option value="">Choose a position</option>
          {options.map(option => <option key={option}>{option}</option>)}
        </select>
      </label>}
      {(decision.choice || role === 'research') && questions.map((label, index) => <label key={label}>{label}
        <input id={'study-answer-' + index} required pattern=".*\S.*" value={answers[index] ?? ''} onChange={event => {
          const values = [...answers];
          values[index] = event.target.value;
          saveAnswers(values);
        }}/>
      </label>)}
      {role === 'pilot' && <p>{capacityBasis
        ? <>Assumption for this recommendation · {capacityBasis}</>
        : 'Open “Compare the options and costs” and enter a nonnegative number of minutes before recording your recommendation.'}</p>}
      <button className="primary" disabled={missingCost}>Record decision</button>
    </form>)}
  </div>;
}
