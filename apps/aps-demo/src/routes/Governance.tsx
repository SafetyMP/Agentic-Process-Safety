import { controlRequirement, experiment, requirements, routeLink } from '../data.ts';
import { Badge, Heading } from '../components/shared.tsx';
import { useSession } from '../components/SessionContext.tsx';
import { caseDefinitions, getCase } from '../domain/cases.ts';

import { runTitle } from '../domain/presentation.ts';
import { CaseEvidenceBridge } from '../components/CaseEvidenceBridge.tsx';

const ruleNames: Record<string, string[]> = {
  'CTL-SCOPE': ['Tool authority'], 'CTL-CAP': ['Spend ceiling'], 'CTL-DEPTH': ['Delegation'],
  'CTL-APPROVAL': ['Approval binding', 'Human threshold'], 'CTL-REPLAY': ['Replay protection'],
  'CTL-EXPIRY': ['Approval freshness'], 'CTL-CONTEXT': ['Context binding'],
  'GAP-CONFLICTING_OBJECTIVES': ['Objective review'],
};
const authorityNotes: Record<string, string> = {
  'CTL-SCOPE': 'The separate gateway authenticates an actor and derives its tool allowlist. Agent-supplied text does not grant a new permission.',
  'CTL-CAP': 'The separate gateway evaluates task and policy spend ceilings. A human grant cannot override an unconditional spending cap.',
  'CTL-EXPIRY': 'The separate gateway resolves server-owned task, context and approval expiry. The browser illustrates approval age below 60 logical seconds; it does not check an actual quotation feed.',
  'CTL-APPROVAL': 'Finance approval binds the exact purchase to the actor, task, resource, action and state. The browser illustrates a matching-approval condition; it does not issue an authorization.',
  'CTL-CONTEXT': 'The separate gateway binds an opaque provenance reference to its task. This does not establish that the source data is true or test live prompt-injection resistance.',
  'CTL-REPLAY': 'Persistent nonces and idempotency prevent repeated local effects in the separate gateway. A retry and a new purchase are different operations.',
  'CTL-DEPTH': 'Delegation depth is derived from server-owned grants in the separate gateway. A client cannot create authority by claiming a smaller depth.',
};

export function Governance({ params }: { params: URLSearchParams }) {
  const { caseDefinition, selectedRun, isDirty } = useSession();
  const activeCase = selectedRun ? getCase(selectedRun.caseId) : caseDefinition;
  const requested = params.get('control');
  const controlId = requested ?? activeCase.control;
  const requirement = controlRequirement(controlId);
  const control = requirement?.controls.find(c => c.id === controlId);
  const allControls = [...new Map(requirements.flatMap(r => r.controls).map(c => [c.id, c])).values()];
  const trials = experiment.trials.filter(t => t.requirement_links.some(r => r.controls.some(c => c.id === controlId)));
  const mappedCases = caseDefinitions.filter(c => c.control === controlId);
  const checks = ruleNames[controlId] ?? [];

  return <>
    <Heading eyebrow="CONTROLS / INSPECT THE CONDITION" title="What does this protection actually check?">Trace a proposed control from its intended purpose to the condition it evaluates, the evidence behind it and the question it leaves open.</Heading>
    <section className="panel"><label><span id="inspect-control-label">Inspect control</span><select aria-labelledby="inspect-control-label" value={control ? controlId : ''} onChange={e => { window.location.hash = routeLink('governance', 'control', e.target.value); }}><option value="" disabled>Choose a proposed control</option>{allControls.map(c => <option value={c.id} key={c.id}>{c.id} · {c.description}</option>)}</select></label></section>
    {!control || !requirement ? <section className="notice" role="status"><h2>No control mapping found</h2><p>The requested control “{controlId}” is not in the frozen proposal mapping. No different control has been substituted.</p><a href={routeLink('governance')}>Inspect the active case’s control →</a></section> : <>
      <CaseEvidenceBridge activeCase={activeCase} kind="control" matches={controlId === activeCase.control} sourceLabel={control.description}/>
      <div className="split control-inspection"><section className="panel"><Badge tone={control.status === 'gap' ? 'danger' : 'teal'}>{control.status === 'gap' ? 'EXPLICIT CONTROL GAP' : 'IMPLEMENTATION LINK EXISTS'}</Badge><h2>{control.description}</h2><p>{requirement.text}</p><p className="mono">{control.id} · requirement {requirement.id} · {requirement.state}</p><h3>Where authority comes from</h3><p>{authorityNotes[control.id] ?? (control.status === 'gap' ? 'No implemented mechanism establishes the full meaning of this deviation. Further expert design is required.' : 'This control is linked to the separate research implementation. Browser inspection does not execute or authorize that implementation.')}</p><h3>What remains unresolved</h3><p>{control.gap}</p>{control.id === 'CTL-EXPIRY' && <p className="notice">Expiry of finance approval is narrower than quotation validity. Even a fresh matching approval does not establish that the price, forecast or physical stock is correct.</p>}{control.id === 'GAP-CONFLICTING_OBJECTIVES' && <p className="notice">The recorded goal-conflict case measures a simplified budget violation. It does not establish resolution of conflicting objectives. A discussion recommendation cannot close this gap.</p>}</section>
      <aside className="panel"><p className="eyebrow">INTENT → DEVIATION → CONTROL → EVIDENCE</p><h2>Follow the claim</h2><p><a href={routeLink('hazop', 'hazard', requirement.hazard_id)}>Inspect the source hazard →</a></p><p>The finding remains unverified and the requirement proposed. An implementation link does not establish effectiveness.</p><details><summary>Inspect implementation and test mapping</summary><p>Implementation: <code>{control.implementation}</code></p><p>Test selector: <code>{control.test}</code></p></details><a href={routeLink('assurance', 'control', control.id)}>Inspect recorded evidence and test mapping →</a><h3>Explore an illustrative case</h3>{mappedCases.length ? mappedCases.map(c => <p key={c.id}><a href={routeLink('simulator', 'story', c.id)}>{c.title} →</a></p>) : <p>No interactive case for this control. Its source mapping remains available for inspection.</p>}</aside></div>
      <section className="panel"><Badge>Illustrative browser comparison</Badge><h2>How the selected run treated this condition</h2>{selectedRun ? <><p>Run {selectedRun.id}: {runTitle(selectedRun)}. These checks belong to its retained input snapshot.</p>{selectedRun.caseId !== caseDefinition.id && <p className="notice">This retained run belongs to a different case from the current draft. It has not been relabeled as the draft case.</p>}{isDirty && <p className="notice">Draft inputs have changed. This run still describes the original request; return to the Case Lab to evaluate the draft.</p>}<p>Actor <strong>{selectedRun.request.actor}</strong> · amount <strong>{selectedRun.request.amount}</strong> · approval age <strong>{selectedRun.request.approvalAge}</strong> logical seconds</p>{checks.length ? <div className="table-scroll"><table><caption>Selected run checks for {controlId}</caption><thead><tr><th>Condition</th><th>B · tool and spend</th><th>C · lifecycle checks</th></tr></thead><tbody>{checks.map(name => <tr key={name}><th scope="row">{name}</th>{(['B', 'C'] as const).map(mode => { const check = selectedRun.results[mode].checks.find(c => c.rule === name); return <td key={mode}>{check ? <><strong>{check.status}{check.terminal ? ` → ${check.terminal}` : ''}</strong><small>{check.reason}</small></> : 'Not included in this bundle'}</td>; })}</tr>)}</tbody></table></div> : <p>This source control has no equivalent check in the browser model. No browser outcome is presented as evidence for it.</p>}</> : <p>No comparison has been evaluated in this session. The control documentation and frozen evidence are still available.</p>}<div className="button-row"><a className="button primary" href={routeLink('simulator')}>Return to comparison →</a></div></section>
      <section className="panel"><Badge>Recorded experimental results</Badge><h2>Related recorded trials</h2><p>These are original observations from simulated adapters, separate from any edited browser request.</p>{trials.length ? <div className="table-scroll"><table><caption>Frozen trials linked to {controlId}</caption><thead><tr><th>Trial</th><th>Arm</th><th>Unsafe mutations / attack calls</th><th>Completed</th></tr></thead><tbody>{trials.map(t => <tr key={t.sequence}><td><a href={routeLink('assurance', 'trial', String(t.sequence))}>#{t.sequence} · {t.fault}</a></td><td>{t.configuration}</td><td>{t.outcome.unsafe_mutations}/{t.outcome.attack_attempts}</td><td>{t.completed ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div> : <p>No distinct recorded trial maps to this control in the selected experiment. A test selector alone does not create a recorded trial.</p>}</section>
    </>}
  </>;
}
