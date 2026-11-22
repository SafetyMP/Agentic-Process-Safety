import { useSession } from './SessionContext.tsx';
import { downloadText } from '../download.ts';
import { blankFields, eligibleUpdates, fieldUpdates, handoffBrief, handoffFields, requisition, type Handoff, type UpdateId } from '../domain/audience.ts';
import type { ComparisonRun } from '../domain/comparison.ts';

export function PurchasingHandoff({ run }: { run: ComparisonRun }) {
  const { discussions, updateDiscussion, prepareExpiry } = useSession();
  const options = eligibleUpdates(run);
  if (!options.length) return <p>This handoff starts with a held approval or a duplicate request. <a onClick={prepareExpiry} href="#/simulator?story=stale&age=61&task=field">Prepare the 61-second request</a> and run the comparison.</p>;
  const work = discussions[run.id]?.fieldWork;
  const id = work?.selected ?? options[0];
  const draft = work?.drafts[id] ?? blankFields(handoffFields);
  function save(selected: UpdateId, next: Handoff) {
    updateDiscussion(run.id, { fieldWork: { selected, drafts: { ...work?.drafts, [selected]: next } }, ready: false });
  }
  function edit(key: keyof Handoff, value: string) {
    save(id, { ...draft, [key]: value });
  }
  const brief = handoffBrief(run, id, draft);
  return <>
    <h3>Shift handoff</h3>
    <div className="audience-facts"><div><small>Selected comparison</small><strong>{run.id} · lane C</strong></div><div><small>Order status</small><strong>{id === 'replay' ? 'Repeat request blocked' : 'Order held'}</strong></div><div><small>Action owner</small><strong>{draft.owner || 'Unassigned'}</strong></div><div><small>Due by</small><strong>{draft.due || 'Open'}</strong></div></div>
    <p>{id === 'replay' ? 'The status of the original purchase needs reconciliation.' : 'The material need is still open in the model. Use a fictional purchasing update to decide what the next shift should do.'}</p>
    <div className="record-card"><h4>Fictional purchasing records</h4>
      {id !== 'replay' && <><p>{requisition}</p><p>Finance approval expired at release. Renewal is outstanding.</p></>}
      {options.length > 1 && <fieldset><legend>Purchasing update</legend>{options.map(option => <label key={option} className="inline-checkbox"><input name="purchasing-update" type="radio" checked={option === id} onChange={() => save(option, work?.drafts[option] ?? blankFields(handoffFields))}/>{fieldUpdates[option].title}</label>)}</fieldset>}
      <p>{fieldUpdates[id].record}</p></div>
    <div className="discussion-fields">
      <label><span id="field-disposition-label">Proposed disposition</span><select aria-labelledby="field-disposition-label" value={draft.disposition} onChange={e => edit('disposition', e.target.value)}>
        <option value="">Choose a disposition</option>
        {(id === 'replay' ? ['Reconcile the original order before retrying', 'Escalate an unknown order status'] : ['Reconcile inbound and propose closing the requisition', 'Check order history and seek renewed approval', 'Escalate uncertain supply or authority']).map(choice => <option key={choice}>{choice}</option>)}
        <option>Keep the decision open</option></select></label>
      {(Object.keys(handoffFields) as (keyof Handoff)[]).filter(key => key !== 'disposition').map(key => <label key={key}>{handoffFields[key]}<input value={draft[key]} onChange={e => edit(key, e.target.value)}/></label>)}
    </div>
    <details><summary>Preview this shift handoff</summary><pre className="audience-preview">{brief}</pre></details>
    <button onClick={() => downloadText(brief, 'aps-' + run.id + '-' + id + '-handoff.md')}>Download selected handoff</button>
    {id !== 'replay' && <p><a href="#/simulator?story=replay&task=field">Practice a missing order acknowledgment →</a></p>}
  </>;
}
