import { useSession } from './SessionContext.tsx';
import { PurchasingHandoff } from './PurchasingHandoff.tsx';
import { PilotDecision } from './PilotDecision.tsx';
import { ResearchLab } from './ResearchLab.tsx';

export const audienceTasks = [
  { key: 'field', title: 'Prepare a shift handoff' },
  { key: 'pilot', title: 'Decide on a purchasing pilot' },
  { key: 'research', title: 'Reproduce or teach the case' },
] as const;
export function AudienceTasks({ task }: { task?: string | null }) {
  const { selectedRun, isDirty, saveLocal, storageMessage } = useSession();
  const active = audienceTasks.find(item => item.key === task)?.key;
  return <section className="panel audience-tasks" aria-labelledby="task-title">
    <h2 id="task-title">Use this comparison</h2><nav aria-label="Audience tasks" className="button-row">{audienceTasks.map(item => <a key={item.key} className="button" aria-current={active === item.key ? 'true' : undefined} href={'#/simulator?task=' + item.key}>{item.title}</a>)}</nav>
    {active && <div className="audience-task-body">{active === 'research' ? <ResearchLab/> : !selectedRun || isDirty ? <p>Run the current comparison above to start your {active === 'field' ? 'shift handoff' : 'sponsor brief'} for these inputs.</p>
      : active === 'field' ? <PurchasingHandoff run={selectedRun}/> : <PilotDecision run={selectedRun}/>}
      {selectedRun && !isDirty && active !== 'research' && <div className="button-row"><button onClick={saveLocal}>Save audience work in this browser</button><small>{storageMessage || 'Changes stay in memory until you save or download.'}</small></div>}</div>}
  </section>;
}
