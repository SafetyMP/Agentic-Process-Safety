import { useId, useRef, useState } from 'react';
import { hazards, references, requirements } from '../data.ts';
import type { WorkflowState } from '../workflow/index.ts';
import { selectWorkflow } from '../workflow/index.ts';
import { workflowStudies } from '../domain/reviewMappings.ts';
export type ReviewContext = { taskId: string; eventId: string | null; specKey?: string };
const questions = ['Intent & boundary', 'Departure', 'Causes & consequences', 'Safeguards', 'Evidence & owner questions'] as const;
const timingFinding = 'APS-f47191931b96a999a61c';
export function HazopConversation({ state, context, onInspect, hazardId }: { state?: WorkflowState; hazardId?: string; context?: ReviewContext; onInspect?: (id: string) => void }) {
  const [step, setStep] = useState(0); const heading = useRef<HTMLHeadingElement>(null); const identity = useId();
  const scenario = hazardId === timingFinding ? 'approval-delay' : state?.spec.scenario ?? 'approval-delay';
  const study = workflowStudies[scenario];
  const hazard = hazards.find(h => h.id === (hazardId ?? study.findingId));
  const reference = hazard && references.find(r => r.node === hazard.node && r.deviation === hazard.deviation);
  const requirement = hazard && requirements.find(r => r.hazard_id === hazard.id);
  const view = state ? selectWorkflow(state) : null;
  const selected = state && context?.eventId && context.taskId === state.spec.task.id && context.specKey === state.runKey ? state.events.find(e => e.id === context.eventId) : null;
  function inspectQuestion(index: number) { setStep(index); heading.current?.focus(); }
  if (hazardId && hazardId !== timingFinding) return <section aria-label="HAZOP design review"><h2>Selected source finding</h2>{hazard ? <><p>{hazard.id} · {hazard.node}/{hazard.deviation}</p><p>Intent: {hazard.intent}</p><h3>Possible causes and consequences</h3><p>{hazard.causes.join('; ')}. {hazard.consequences.join('; ')}</p><h3>Proposed safeguards</h3><p>{hazard.candidate_controls.join('; ')}</p></> : <p>Requested finding unavailable. No substitute finding or model was selected.</p>}<p data-executive-uncertainty>Unverified source question; ratings unknown. No direct validation by the active purchasing run is claimed. No owner is assigned or requirement approved.</p><p>Use Technical for full record/provenance. The active browser case remains separate.</p></section>;
  return <section className="hazop-conversation" aria-label="HAZOP design review"><p className="eyebrow">DESIGN REVIEW / NOT AN APPROVAL</p><h2>{study.title}</h2><p>{study.summary}</p>
    <p>{state ? `Active task ${state.spec.task.id} · ${view!.scenarioTitle} · mode ${state.spec.mode}.` : 'No current purchasing run was supplied to this source review.'} {context && state && context.taskId !== state.spec.task.id ? 'Selected discussion context belongs to a different task; no model was changed.' : ''} {context?.eventId && !selected ? 'Selected exception is no longer available in this run.' : selected ? `Selected actual event: ${selected.id} · ${selected.type}.` : 'No exception selected; the question remains hypothetical.'}</p>
    {hazardId === timingFinding && state && state.spec.scenario !== scenario && <section aria-label="Separate selected record context"><p>The active run is not the approval-expiry exercise; its effects do not demonstrate this timing hypothesis.</p><p>This explicitly selected source opens a separate timing study. The active purchasing run is retained.</p></section>}
    <p className={`case-limit${scenario === 'approval-delay' ? ' timing-gap' : ''}`} data-executive-uncertainty><strong>{scenario === 'approval-delay' ? 'Related timing finding—different object/coverage' : `Source mapping: ${study.coverage}`}</strong><br/>{scenario === 'approval-delay' ? study.mappingNote.split(': ').slice(1).join(': ') : study.mappingNote}</p>
    <ol className="review-questions">{questions.map((q, index) => <li key={q}><button aria-current={step === index ? 'step' : undefined} onClick={() => inspectQuestion(index)}>{q}</button></li>)}</ol>
    <h3 ref={heading} tabIndex={-1} id={identity}>{questions[step]}</h3><div aria-labelledby={identity}><p>{study.questions[step]}</p>
      {step === 2 && reference && <p>The related authored source is distinct: {reference.cause}; {reference.consequence}. This is not an observed consequence of the active browser run.</p>}
      {step === 3 && hazard && <><p>Declared source safeguards: {hazard.safeguards.join('; ')}. Declared constraints are not proven safeguards.</p><p>Original proposed control: {hazard.candidate_controls.join('; ')}. {requirement ? `${requirement.id} remains ${requirement.state}. ${requirement.controls.map(c => `${c.id}: ${c.gap}`).join(' ')}` : 'No direct authored requirement is mapped.'}</p></>}
      {step === 4 && <><p>{view ? `Observed current run: ${view.metrics.committedOrders} orders, ${view.metrics.spent} simulated units, confirmation ${view.metrics.completed ? 'supported' : 'absent'}, unsafe modeled effects ${view.metrics.unsafeCommittedEffects}.` : 'No current-run observations available.'} This is separate from the frozen experiment and hypothetical consequences.</p><p>Residual risk, severity, likelihood and business benefit are unknown. No people are assigned here. These prompts do not accept a finding or approve a requirement. Capture proposed next actions in the leadership decision brief.</p></>}
    </div><div className="button-row"><button disabled={step === 0} onClick={() => inspectQuestion(step - 1)}>Previous review question</button><button disabled={step === questions.length - 1} onClick={() => inspectQuestion(step + 1)}>Next review question</button>{selected && onInspect && <button onClick={() => onInspect(selected.id)}>Inspect technical evidence</button>}</div>
    {hazard && <details><summary>Inspect the related source identity</summary><p>{hazard.id} · {hazard.node}/{hazard.deviation} · {hazard.review_state}; severity unknown, likelihood unknown, residual risk {hazard.residual_risk}.</p><p>Original intent: {hazard.intent}. {reference?.id} · {requirement?.id ?? 'No authored requirement'}. These source identities are not a newly approved mapping to this workflow exercise.</p></details>}
  </section>;
}
