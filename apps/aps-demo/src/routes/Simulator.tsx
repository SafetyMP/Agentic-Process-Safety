import { useEffect, useRef, useState } from 'react';
import { caseDefinitions, getCase } from '../domain/cases.ts';
import { runTitle } from '../domain/presentation.ts';
import type { StoryId } from '../domain/scenarios.ts';
import { routeLink } from '../data.ts';
import { useSession } from '../components/SessionContext.tsx';
import { Badge, Heading } from '../components/shared.tsx';
import { ComparisonView } from '../components/ComparisonView.tsx';
import { FailurePath } from '../components/FailurePath.tsx';
import { DiscussionWorksheet } from '../components/DiscussionWorksheet.tsx';
import { CaseProgress, timingReference } from '../components/CaseProgress.tsx';

export function Simulator() {
  const { draft, caseDefinition, validation, configError, runs, selectedRun, isDirty, prediction, discussions, setPrediction, setCase, setApprovalAge, runComparison, selectRun, resetInputs } = useSession();
  const [showBaseline, setShowBaseline] = useState(false);
  const [compareWith, setCompareWith] = useState('');
  const [positionOpened, setPositionOpened] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const ageInput = useRef<HTMLInputElement>(null);
  const focusResult = useRef(false);
  useEffect(() => {
    if (focusResult.current && selectedRun) { resultHeading.current?.focus(); resultHeading.current?.scrollIntoView?.({ block: 'start' }); focusResult.current = false; }
  }, [selectedRun]);
  const earlierRuns = runs.filter(run => run.id !== selectedRun?.id);
  const previous = earlierRuns.find(run => run.id === compareWith) ?? earlierRuns.at(-1);
  const timingBaseline = timingReference(selectedRun, runs);
  const runCase = selectedRun ? getCase(selectedRun.caseId) : caseDefinition;
  const input = validation.request;
  const readableAge = Number.isFinite(Number(draft.approvalAge)) ? Math.min(120, Math.max(0, Number(draft.approvalAge))) : 0;
  const currentStep = !selectedRun || isDirty ? 1 : positionOpened || timingBaseline || discussions[selectedRun.id]?.ready ? 3 : 2;
  function focusSection(id: string) { const section = document.getElementById(id); section?.scrollIntoView?.({ block: 'start' }); section?.focus({ preventScroll: true }); }
  function evaluate() { if (!validation.error && !configError) { setPositionOpened(false); focusResult.current = true; runComparison(); } }
  function explore() {
    if (!selectedRun || isDirty) return;
    if (selectedRun.caseId === 'stale') { ageInput.current?.scrollIntoView?.({ block: 'center' }); ageInput.current?.focus(); }
    else focusSection('case-path');
  }
  function varyTiming() {
    if (!selectedRun || selectedRun.caseId !== 'stale' || isDirty) return;
    setApprovalAge(selectedRun.request.approvalAge >= 60 ? '59' : '61');
    setPositionOpened(false);
    ageInput.current?.scrollIntoView?.({ block: 'center' }); ageInput.current?.focus();
  }
  function formPosition() { setPositionOpened(true); focusSection('discussion'); }
  return <div className="case-lab">
    <Heading eyebrow="CASE LAB / COMPARE AND DISCUSS" title="Permission is only the first question.">First ask what the controls do. Then decide what the people responsible need before another action.</Heading>
    <CaseProgress current={currentStep} hasRun={!!selectedRun} dirty={isDirty} timing={draft.caseId === 'stale'} varied={!!timingBaseline} ready={!!selectedRun && !!discussions[selectedRun.id]?.ready} onCompare={() => focusSection('case-input-panel')} onExplore={explore} onPosition={formPosition}/>
    <section className="panel case-input-panel" id="case-input-panel" tabIndex={-1} aria-labelledby="case-input-title">
      <div className="section-title"><h2 id="case-input-title">One shared request</h2><Badge tone="teal">Illustrative browser model</Badge></div>
      <div className="case-controls"><label><span id="case-select-label">Choose a case</span><select aria-labelledby="case-select-label" value={draft.caseId} onChange={event => { setCase(event.target.value as StoryId); setPositionOpened(false); }}>{caseDefinitions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="case-objective"><strong>Intended objective</strong><p>{caseDefinition.objective}</p></div></div>
      <dl className="request-facts"><div><dt>Actor</dt><dd>{input?.actor ?? caseDefinition.preset.actor}</dd></div><div><dt>Amount</dt><dd>{input?.amount ?? caseDefinition.preset.amount} sandbox units</dd></div><div><dt>Attempt</dt><dd>{draft.caseId === 'stale' ? 'Submit a purchase using an earlier finance approval' : caseDefinition.operation}</dd></div></dl>
      <div className="bundle-introduction" aria-label="The two control bundles"><div><strong>B · Tool permission + spend limit</strong><p>Checks who may use the tool and whether the amount is within its limit.</p></div><div><strong>C · Lifecycle checks added</strong><p>Also checks conditions connecting the request to its task, approval and workflow.</p></div></div>
      {draft.caseId === 'stale' ? <div className="age-control"><label>Approval age (logical seconds)<input ref={ageInput} type="number" min="0" max="120" step="1" value={draft.approvalAge} aria-invalid={!!validation.error} aria-describedby="approval-age-help approval-age-error" onChange={event => setApprovalAge(event.target.value)}/></label><label className="age-range">Adjust approval age<input type="range" min="0" max="120" step="1" value={readableAge} onChange={event => setApprovalAge(event.target.value)}/></label><div className="age-shortcuts" aria-label="Approval age examples">{[59, 60, 61].map(age => <button key={age} type="button" aria-pressed={draft.approvalAge === String(age)} onClick={() => setApprovalAge(String(age))}>{age} seconds</button>)}</div><p id="approval-age-help" className="muted">The declared approval lifetime is less than 60 logical seconds. This rule stays fixed while you vary request timing.</p></div> : <p className="muted">This preset holds request fields fixed so you can inspect {draft.caseId === 'conflict' ? 'the unresolved objective conflict' : draft.caseId === 'context' ? 'whether the request belongs to this task' : 'the selected condition'}. Its downstream business effects may remain unmodeled.</p>}
      <p id="approval-age-error" className="input-error" role={validation.error || configError ? 'alert' : undefined}>{configError || validation.error || ''}</p>
      <details className="prediction-details"><summary>Predict the outcome · optional</summary><div className="control-grid"><label><span id="prediction-select-label">Prediction</span><select aria-labelledby="prediction-select-label" value={prediction.choice} onChange={event => setPrediction({ choice: event.target.value })}><option value="">Skip prediction</option><option value="both">Both execute</option><option value="B">Only B executes</option><option value="C">Only C executes</option><option value="neither">Neither executes</option><option value="unsure">Unsure</option></select></label><label><span id="prediction-rationale-label">Why do you expect that?</span><textarea aria-labelledby="prediction-rationale-label" value={prediction.rationale} onChange={event => setPrediction({ rationale: event.target.value })} rows={2} placeholder="Which condition might matter?"/></label></div><p className="muted">Your prediction is saved with this comparison for discussion. It is not a competence score.</p></details>
      <div className="button-row"><button className="primary" disabled={!!validation.error || !!configError} onClick={evaluate}>Run comparison</button><button onClick={resetInputs}>Reset inputs</button><span>Both lanes start from the same state. No real purchase executes.</span></div>
      {isDirty && selectedRun && <p className="notice draft-notice">Inputs changed — run again. The retained results below still describe {selectedRun.id}: {runTitle(selectedRun)}, age {selectedRun.request.approvalAge}s.</p>}
    </section>

    {selectedRun ? <>
      <div className="section-title comparison-toolbar"><h2 ref={resultHeading} tabIndex={-1} className="result-focus">Comparison results</h2><label className="inline-checkbox"><input type="checkbox" checked={showBaseline} onChange={event => setShowBaseline(event.target.checked)}/> Include A · no modeled checks</label></div>
      <p role="status" className="sr-only">{selectedRun.id}: B {selectedRun.results.B.decision}; C {selectedRun.results.C.decision}. Approval age {selectedRun.request.approvalAge} logical seconds.</p>
      <ComparisonView run={selectedRun} showBaseline={showBaseline}/>
      <section className="panel journey-next" aria-labelledby="journey-next-title">
        <h2 id="journey-next-title">{isDirty ? 'Compare the changed request next' : timingBaseline ? 'What changed when timing changed?' : selectedRun.caseId === 'stale' ? 'Try the other side of the expiry boundary' : 'Inspect the condition, then form a position'}</h2>
        {isDirty ? <><p>Your earlier result remains intact. Run the changed input before drawing a new conclusion or forming its position.</p><button onClick={() => focusSection('case-input-panel')}>Return to changed inputs</button></> : <>
          {timingBaseline ? <div className="variation-delta" aria-label="Timing variation comparison"><p><strong>Retained request:</strong> {timingBaseline.request.approvalAge}s · B {timingBaseline.results.B.decision} · C {timingBaseline.results.C.decision}.</p><p><strong>Selected request:</strong> {selectedRun.request.approvalAge}s · B {selectedRun.results.B.decision} · C {selectedRun.results.C.decision}.</p><p>Only approval age differs between these request inputs; both start from the same modeled state. {timingBaseline.results.C.decision === selectedRun.results.C.decision ? 'These ages stay on the same side of the validity boundary.' : 'The C decision changes at approval freshness.'} Neither result establishes quotation validity.</p></div> : <p>{selectedRun.caseId === 'stale' ? 'Change only approval age. Keep this result and run the new request to see whether either decision changes.' : 'The path names the request condition and where evaluation stops. Inspect it before deciding what evidence or ownership the outstanding question needs.'}</p>}
          <div className="button-row">{selectedRun.caseId === 'stale' && !timingBaseline ? <button className="primary" onClick={varyTiming}>Try {selectedRun.request.approvalAge >= 60 ? '59' : '61'} seconds</button> : <button className="primary" onClick={formPosition}>Form a position →</button>}<button onClick={() => focusSection('case-path')}>Inspect the decision path</button>{selectedRun.caseId === 'stale' && !timingBaseline && <button className="text-button" onClick={formPosition}>Form a position now</button>}</div>
        </>}
      </section>
      <div id="case-path" tabIndex={-1}><FailurePath key={selectedRun.id} run={selectedRun}/></div>
      <DiscussionWorksheet/>
      <details className="panel case-reference-links"><summary>Inspect supporting hazards, controls and recorded evidence</summary><nav className="case-links button-row" aria-label="Follow this case">{runCase.hazardId && <a className="button" href={routeLink('hazop', 'hazard', runCase.hazardId)}>Inspect related hazard →</a>}<a className="button" href={routeLink('governance', 'control', runCase.control)}>Inspect control →</a><a className="button" href={routeLink('assurance', 'story', runCase.id)}>Related recorded evidence →</a></nav><p className="muted">{runCase.evidenceNote}</p></details>
      <section className="panel run-history" aria-labelledby="run-history-title"><div className="section-title"><h2 id="run-history-title">Keep the comparison in view</h2><Badge>{runs.length} retained {runs.length === 1 ? 'run' : 'runs'}</Badge></div><p>Every run keeps its own inputs, prediction and discussion. Rerunning does not add another order to an earlier result.</p><div className="history-controls"><label><span id="selected-comparison-label">Selected comparison</span><select aria-labelledby="selected-comparison-label" value={selectedRun.id} onChange={event => { selectRun(event.target.value); setPositionOpened(false); }}>{runs.map(run => <option key={run.id} value={run.id}>{run.id} · {runTitle(run)} · age {run.request.approvalAge}s</option>)}</select></label>{runs[0] && runs[0].id !== selectedRun.id && <button onClick={() => { selectRun(runs[0].id); setPositionOpened(false); }}>Return to original comparison</button>}</div>
        {previous && <details className="previous-comparison"><summary>Compare with a retained run</summary><label><span id="compare-with-label">Compare with</span><select aria-labelledby="compare-with-label" value={previous.id} onChange={event => setCompareWith(event.target.value)}>{earlierRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {runTitle(run)} · age {run.request.approvalAge}s</option>)}</select></label><div className="run-comparison-summary"><p><strong>Selected:</strong> {selectedRun.id}, age {selectedRun.request.approvalAge}s — B {selectedRun.results.B.decision}, C {selectedRun.results.C.decision}.</p><p><strong>Retained:</strong> {previous.id}, age {previous.request.approvalAge}s — B {previous.results.B.decision}, C {previous.results.C.decision}.</p><p>{selectedRun.caseId === previous.caseId ? 'Compare the snapshots below to see what changed.' : 'These are different cases; do not attribute the difference to approval age alone.'}</p></div><ComparisonView run={previous} compact/></details>}
      </section>
    </> : <><section className="panel comparison-empty"><h2>What will happen at the boundary?</h2><p>Follow the same request through both bundles. After comparing their decisions, ask what would justify the next action.</p><ol><li>Inspect the shared request and two bundles.</li><li>Optionally predict the outcome.</li><li>Run both bundles together.</li></ol></section><DiscussionWorksheet/></>}

    <details className="panel case-library" id="case-library"><summary>Browse all nine cases and their evidence limits</summary><div className="case-library-grid">{caseDefinitions.map(item => <article key={item.id}><h3>{item.title}</h3><p>{item.objective}</p><Badge>{item.fault ? 'Related recorded fault family' : 'No distinct recorded trial'}</Badge><p>{item.limitation}</p><button onClick={() => { setCase(item.id); setPositionOpened(false); focusSection('case-input-panel'); }}>Explore {item.title.toLowerCase()}</button></article>)}</div></details>
  </div>;
}
