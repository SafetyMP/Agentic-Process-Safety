import { useSession } from './SessionContext.tsx';
import type { ComparisonRun } from '../domain/comparison.ts';
import { blankFields, costEstimate, pilotBrief, pilotFields, pilotMeasures, type Pilot } from '../domain/audience.ts';
import { downloadText } from '../download.ts';

export function PilotDecision({ run }: { run: ComparisonRun }) {
  const { discussions, updateDiscussion } = useSession();
  const draft = discussions[run.id]?.pilot ?? blankFields(pilotFields);
  function edit(key: keyof Pilot, value: string) {
    updateDiscussion(run.id, { pilot: { ...draft, [key]: value }, ready: false });
  }
  function field(key: keyof Pilot, numeric = false) {
    return <label key={key}>{pilotFields[key]}<input type={numeric ? 'number' : 'text'} min={numeric ? 0 : undefined} step={numeric ? 'any' : undefined} value={draft[key]} onChange={e => edit(key, e.target.value)}/></label>;
  }
  const brief = pilotBrief(run, draft);
  return <><h3>Purchasing pilot decision</h3><p><strong>{run.id} · B {run.results.B.decision} / C {run.results.C.decision}.</strong> {run.results.C.reason} What would this control cost your buying team when a legitimate order waits?</p>
    <p>Compare buyer-led ERP purchasing with agent recommendations in shadow mode for one site and category. Both groups use the same policy and records. Buyers retain release authority.</p>
    <div className="discussion-fields"><label><span id="pilot-decision-label">Sponsor decision</span><select aria-labelledby="pilot-decision-label" value={draft.decision} onChange={e => edit('decision', e.target.value)}><option value="">Select a decision</option><option>Evaluate in shadow mode</option><option>Defer pending evidence</option><option>Retain the current workflow</option></select></label>
      {(['scope','sponsor','authority','serviceOwner','stop','review','tradeoff','window'] as const).map(key => field(key))}
    </div>
    <h4>Measures to collect in the field</h4><div className="table-scroll"><table><caption>Proposed field measures and accountable teams</caption><thead><tr><th>Measure</th><th>Source</th><th>Suggested owner</th></tr></thead><tbody>{pilotMeasures.map(row => <tr key={row[0]}>{row.map(cell => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>
    <details><summary>Estimate the cost of a hold</summary><p>Enter assumptions in one currency. Handling cost equals minutes divided by 60 times the hourly rate, plus any expedite cost. Modeled spend is a separate quantity.</p><div className="discussion-fields">{(['minutes','rate','expedite'] as const).map(key => field(key,true))}</div><p>{costEstimate(draft)}</p></details>
    <details><summary>Preview sponsor brief</summary><pre className="audience-preview">{brief}</pre></details>
    <button onClick={() => downloadText(brief,'aps-' + run.id + '-pilot.md')}>Download sponsor brief</button></>;
}
