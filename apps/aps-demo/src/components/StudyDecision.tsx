import { useEffect, useRef, useState, type FormEvent } from 'react';
import { eligibleUpdates, fieldUpdates, requisition, type UpdateId } from '../domain/audience.ts';
import type { ComparisonRun } from '../domain/comparison.ts';

const roles = {
  pilot: {
    name: 'Executive',
    prompt: 'Would you sponsor a shadow pilot? Compare recommendations with the buyer-led ERP process while buyers retain release authority.',
    question: 'Sponsor decision',
    options: ['Sponsor a shadow pilot', 'Defer pending evidence', 'Keep the current workflow'],
    fields: ['Stop condition and who can pause the pilot'],
  },
  field: {
    name: 'Field manager',
    prompt: 'Continue from C’s hold. No order was placed in that lane. Choose a purchasing update and decide what the buying team should do next.',
    question: 'Proposed disposition',
    options: ['Reconcile and propose closing the requisition', 'Seek current authorization and recheck the quote', 'Keep open and escalate for review'],
    fields: ['Evidence supporting the disposition', 'Action owner', 'Deadline'],
  },
  research: {
    name: 'Professor or researcher',
    prompt: 'Interpret what the timing comparison tells you. The timing data and learner prediction exercise are below.',
    question: 'Interpretation of the boundary',
    options: ['Evidence of a modeled finance-approval boundary', 'Need to test the 59/60/61-second boundary before drawing a conclusion'],
    fields: ['One limit or field observation to collect'],
  },
} as const;

type Role = keyof typeof roles;
type Decision = { choice: string; fields: string[]; submitted: boolean };
const blank: Decision = { choice: '', fields: [], submitted: false };

export function useStudyDecisions() {
  const [role, setRole] = useState<Role | ''>('');
  const [update, setUpdate] = useState<UpdateId>('inbound');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  return { role, setRole, update, setUpdate, decisions, setDecisions };
}

export function StudyDecision({ run, retainedRuns, onSelectRun, drafts }: {
  run: ComparisonRun;
  retainedRuns: ComparisonRun[];
  onSelectRun: (run: ComparisonRun) => void;
  drafts: ReturnType<typeof useStudyDecisions>;
}) {
  const { role, setRole, update, setUpdate, decisions, setDecisions } = drafts;
  const choiceInput = useRef<HTMLSelectElement>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const moveFocus = useRef(false);
  const key = run.id + '/' + role + (role === 'field' ? '/' + update : '');
  const decision = decisions[key] ?? blank;
  const updates = eligibleUpdates(run);
  const fieldUnavailable = role === 'field' && !updates.includes(update);
  const task = role && !fieldUnavailable ? roles[role] : null;
  const submitted = decision.submitted;

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    if (submitted) summary.current?.focus();
    else choiceInput.current?.focus();
  }, [submitted]);

  function save(next: Decision) {
    setDecisions(previous => ({ ...previous, [key]: next }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    moveFocus.current = true;
    save({ ...decision, fields: decision.fields.map(value => value.trim()), submitted: true });
  }

  return <div className="study-decision">
    <p className="study-basis">Decision basis · {run.request.approvalAge} logical seconds · B {run.results.B.executed ? 'released' : 'held'}, C {run.results.C.executed ? 'released' : 'held'}. Proposals are kept in this visit for the selected comparison.</p>
    <label>Choose your role
      <select value={role} onChange={event => setRole(event.target.value as Role | '')}>
        <option value="">Select an audience</option>
        {(Object.keys(roles) as Role[]).map(id => <option key={id} value={id}>{roles[id].name}</option>)}
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
    {task && <>
      <p>{task.prompt}</p>
      {role === 'field' && <div className="study-update">
        <label>Fictional purchasing update
          <select value={update} onChange={event => setUpdate(event.target.value as UpdateId)}>
            {updates.map(id => <option key={id} value={id}>{fieldUpdates[id].title}</option>)}
          </select>
        </label>
        <p>{requisition}</p>
        <p>{fieldUpdates[update].record}</p>
        <p>Before any further release, reconcile prior orders and confirm current authority.</p>
      </div>}
      {submitted ? <div className="study-result">
        <h3 ref={summary} tabIndex={-1}>Decision recorded for discussion</h3>
        <p className="study-response"><strong>{decision.choice}</strong>{role === 'field' && ` · ${fieldUpdates[update].title}. C held the order at ${run.request.approvalAge} logical seconds and placed no order.`}</p>
        <dl>{task.fields.map((label, index) => <div key={label}><dt>{label}</dt><dd className="study-response">{decision.fields[index]}</dd></div>)}</dl>
        <p>This proposal grants no purchasing or pilot authority.</p>
        <button onClick={() => { moveFocus.current = true; save({ ...decision, submitted: false }); }}>Revise decision</button>
      </div> : <form className="study-form" key={key} onSubmit={submit}>
        <label>{task.question}
          <select ref={choiceInput} required value={decision.choice} onChange={event => save({ ...decision, choice: event.target.value })}>
            <option value="">Choose a position</option>
            {task.options.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        {task.fields.map((label, index) => <label key={label}>{label}
          <input required pattern=".*\S.*" value={decision.fields[index] ?? ''} onChange={event => {
            const fields = [...decision.fields];
            fields[index] = event.target.value;
            save({ ...decision, fields });
          }}/>
        </label>)}
        <button className="primary">Record decision</button>
      </form>}
    </>}
  </div>;
}
