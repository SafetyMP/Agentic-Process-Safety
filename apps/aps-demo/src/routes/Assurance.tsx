import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { acceptance, experiment, manifest, requirements, stages, routeLink } from '../data.ts';
import { caseDefinitions, getCase, isCaseId } from '../domain/cases.ts';
import { useSession } from '../components/SessionContext.tsx';
import { ComparisonView } from '../components/ComparisonView.tsx';
import { Badge, Heading, Stat } from '../components/shared.tsx';
import { TestEvidence } from '../components/TestEvidence.tsx';
import { EvidenceComparison } from '../components/EvidenceComparison.tsx';

import { runTitle } from '../domain/presentation.ts';
import { CaseEvidenceBridge } from '../components/CaseEvidenceBridge.tsx';

type Trial = typeof experiment.trials[number];

function RecordedCharts() {
  const chart = Object.entries(experiment.configurations).map(([name, value]) => ({ name, mutations: value.unsafe_mutations, attacks: value.attack_attempts, completed: value.completed_trials, planned: value.planned_trials }));
  return <section className="panel recorded-summary" aria-labelledby="recorded-summary-title">
    <Badge>Recorded experimental results</Badge><h2 id="recorded-summary-title">What did the wider experiment observe?</h2>
    <p>Thirty recorded trials from one finite experiment. Attack-call and trial denominators describe different observations; early termination makes attack-call denominators unequal. These counts are not real-world effectiveness estimates.</p>
    <div className="evidence-charts">
      <div><h3>Unsafe mutations and attack calls</h3><div className="chart" role="img" aria-label="Recorded unsafe mutations: A 10 of 10 attack calls, B 6 of 9, C 0 of 8. Full data table follows.">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={chart} margin={{ top: 25, right: 15, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{ fill: 'var(--muted)' }}/><YAxis allowDecimals={false} tick={{ fill: 'var(--muted)' }}/><Tooltip/><Legend/>
          <Bar dataKey="attacks" fill="#899ab3" name="Attack calls" isAnimationActive={false} radius={[4, 4, 0, 0]}><LabelList dataKey="attacks" position="top" fill="var(--text)"/></Bar>
          <Bar dataKey="mutations" fill="#ca725d" name="Unsafe mutations" isAnimationActive={false} radius={[4, 4, 0, 0]}><LabelList dataKey="mutations" position="top" fill="var(--text)"/></Bar>
        </BarChart></ResponsiveContainer>
      </div></div>
      <div><h3>Completed and planned trials</h3><div className="chart" role="img" aria-label="Recorded completed trials: A 5 of 10, B 3 of 10, C 3 of 10. Full data table follows.">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}><BarChart data={chart} margin={{ top: 25, right: 15, left: 0, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{ fill: 'var(--muted)' }}/><YAxis allowDecimals={false} tick={{ fill: 'var(--muted)' }}/><Tooltip/><Legend/>
          <Bar dataKey="planned" fill="#899ab3" name="Planned trials" isAnimationActive={false} radius={[4, 4, 0, 0]}><LabelList dataKey="planned" position="top" fill="var(--text)"/></Bar>
          <Bar dataKey="completed" fill="#188e86" name="Completed trials" isAnimationActive={false} radius={[4, 4, 0, 0]}><LabelList dataKey="completed" position="top" fill="var(--text)"/></Bar>
        </BarChart></ResponsiveContainer>
      </div></div>
    </div>
    <div className="table-scroll"><table><caption>Recorded counts and denominators; missing measurements are never inferred as zero</caption><thead><tr><th>Arm</th><th>Unsafe mutations / attack calls</th><th>Completed / planned trials</th><th>False denials / benign trials</th><th>Missing trials</th></tr></thead><tbody>{Object.entries(experiment.configurations).map(([id, value]) => <tr key={id}><th scope="row">{id}</th><td>{value.unsafe_mutations}/{value.attack_attempts}</td><td>{value.completed_trials}/{value.planned_trials}</td><td>{value.false_denials}/{value.false_denial_denominator}</td><td>{value.missing_trials}</td></tr>)}</tbody></table></div>
  </section>;
}

function TrialReplay({ trial }: { trial: Trial }) {
  const [replay, setReplay] = useState(0);
  return <section className="panel" id={`trial-${trial.sequence}`} aria-labelledby="replay-title">
    <Badge>Replayed test evidence</Badge><h2 id="replay-title">Recorded trial #{trial.sequence} · {trial.configuration} / {trial.fault}</h2>
    <p>Step through the retained call order. These controls reveal recorded events; they do not run a gateway or create new evidence.</p>
    <div className="button-row"><button disabled={replay >= trial.calls.length} onClick={() => setReplay(value => Math.min(trial.calls.length, value + 1))}>Replay next recorded call</button><button onClick={() => setReplay(0)}>Restart replay</button><button disabled={replay === trial.calls.length} onClick={() => setReplay(trial.calls.length)}>Show all recorded calls</button><span role="status">{replay}/{trial.calls.length} calls shown</span></div>
    <ol className="replay-list">{trial.calls.slice(0, replay).map(call => <li key={call.index}><strong>{call.actor} → {call.action}</strong> · {call.decision} · {call.executed ? 'executed' : 'not executed'}{call.cached ? ' · cached result' : ''}<small>Recorded logical time {call.logical_time_seconds}; not measured runtime</small><small>Observed input violations: {call.violations.length ? call.violations.join(', ') : 'none recorded'}</small></li>)}</ol>
    <details><summary>Trial identity and linked findings</summary><p className="mono">Trial: {trial.case_id}<br/>Record SHA256: {trial.hash}<br/>Case digest: {trial.case_digest}</p><div className="button-row">{trial.hazard_links.map(hazard => <a key={hazard.id} href={routeLink('hazop', 'hazard', hazard.id)}>{hazard.id} →</a>)}</div>{trial.hazard_links.length === 0 && <p>No hazard mapping is attached to this trial.</p>}</details>
  </section>;
}

export function Assurance({ params }: { params: URLSearchParams }) {
  const { selectedRun, caseDefinition, setCase, resetInputs, discussions, updateDiscussion, isDirty } = useSession();
  const [attachment, setAttachment] = useState<{ runId: string; trial: number } | null>(null);
  const requestedTrial = params.get('trial');
  const requestedControl = params.get('control');
  const knownControl = requestedControl && requirements.some(requirement => requirement.controls.some(control => control.id === requestedControl));
  const control = knownControl ? requestedControl : null;
  const exactTrial = requestedTrial === null ? undefined : experiment.trials.find(trial => String(trial.sequence) === requestedTrial);
  const activeCase = selectedRun ? getCase(selectedRun.caseId) : caseDefinition;
  const requestedStory = params.get('story');
  const evidenceCase = isCaseId(requestedStory) ? getCase(requestedStory) : activeCase;
  const relevantTrials = experiment.trials.filter(trial => control ? trial.requirement_links.some(requirement => requirement.controls.some(item => item.id === control)) : trial.fault === evidenceCase.fault);
  const defaultTrial = relevantTrials.find(trial => trial.configuration === 'C') ?? relevantTrials[0];
  const selectedTrial = requestedTrial !== null ? exactTrial : defaultTrial;
  const [view, setView] = useState<'browser' | 'recorded'>(requestedTrial !== null || requestedControl !== null || params.has('story') || params.get('view') === 'recorded' || !selectedRun ? 'recorded' : 'browser');
  const [arm, setArm] = useState('all');
  const [sort, setSort] = useState('sequence');
  const trials = experiment.trials.filter(trial => arm === 'all' || trial.configuration === arm).sort((a, b) => sort === 'fault' ? a.fault.localeCompare(b.fault) || a.sequence - b.sequence : a.sequence - b.sequence);
  const variantCase = selectedTrial && caseDefinitions.find(item => item.fault === selectedTrial.fault);
  const mismatch = selectedTrial && selectedTrial.fault !== activeCase.fault;
  function attachRecordedEvent(citation: string) {
    if (!selectedRun || !selectedTrial || mismatch || isDirty) return;
    const current = discussions[selectedRun.id]?.evidence ?? '';
    updateDiscussion(selectedRun.id, { evidence: current.includes(citation) ? current : [current, citation].filter(Boolean).join('\n\n'), ready: false });
    setAttachment({ runId: selectedRun.id, trial: selectedTrial.sequence });
  }
  function tryVariation() {
    if (!variantCase) return;
    setCase(variantCase.id);
    resetInputs();
    window.location.hash = routeLink('simulator', 'story', variantCase.id);
  }

  return <>
    <Heading eyebrow="EVIDENCE / CLAIMS AND THEIR LIMITS" title="What supports the conclusion?">Inspect this browser comparison or the frozen experiments. A matching fault family connects them; it does not make a newly edited request a recorded trial.</Heading>
    <div className="button-row evidence-view-switch" role="group" aria-label="Evidence view"><button aria-pressed={view === 'browser'} onClick={() => setView('browser')}>This browser comparison</button><button aria-pressed={view === 'recorded'} onClick={() => setView('recorded')}>Recorded experiments</button></div>
    {requestedTrial !== null && !exactTrial && <p className="notice" role="status">No recorded trial matches “{requestedTrial}”. Select an existing trial from the ledger below. No substitute trial has been selected.</p>}
    {requestedControl !== null && !knownControl && <p className="notice" role="status">No control matches “{requestedControl}” in the frozen mappings. The catalogue below remains available; this is not evidence for that requested control.</p>}
    {view === 'browser' ? <>
      <section className="panel live-outcome"><Badge tone="teal">Illustrative browser simulation</Badge><h2>What happened in your comparison?</h2>{selectedRun ? <><p>Run {selectedRun.id} · {runTitle(selectedRun)}. These are retained browser inputs and modeled outcomes.</p><ComparisonView run={selectedRun} compact/>{selectedRun.parent && <p>Hypothetical child of {selectedRun.parent.runId}, lane {selectedRun.parent.lane}. It is not a recorded recovery.</p>}</> : <p>No browser comparison has been evaluated. <a href={routeLink('simulator')}>Open the Case Lab →</a></p>}</section>
      <section className="notice"><h2>What does this establish?</h2><p>The model shows how its declared checks respond to your input. It does not execute OPA, grant operational authority, or validate a quotation, stock record or business objective.</p><p>{activeCase.evidenceNote}</p><button onClick={() => setView('recorded')}>Inspect related recorded evidence →</button></section>
    </> : <>
      {selectedTrial && <CaseEvidenceBridge activeCase={activeCase} kind="recorded" matches={selectedTrial.fault === activeCase.fault} sourceLabel={`Trial #${selectedTrial.sequence} · ${selectedTrial.fault}`}/>}
      <section className="panel evidence-introduction"><Badge>Recorded experimental results</Badge><h2>What happened in the recorded case?</h2><p>{selectedRun ? 'Retained browser comparison' : 'Current browser preset'}: <strong>{selectedRun ? runTitle(selectedRun) : activeCase.title}</strong>.</p><p>Evidence requested for: <strong>{evidenceCase.title}</strong>. {evidenceCase.evidenceNote}</p>{control && <p>Showing the frozen mapping for <strong>{control}</strong>. <a href={routeLink('governance', 'control', control)}>Inspect this control →</a></p>}
        {mismatch && <p className="notice">Selected trial “{selectedTrial.fault}” differs from the active browser case. The trial remains selected; it has not been substituted or presented as your browser run.</p>}
        {selectedTrial ? <><EvidenceComparison trial={selectedTrial} onAttach={selectedRun && !mismatch && !isDirty ? attachRecordedEvent : undefined}/>{attachment?.runId === selectedRun?.id && attachment?.trial === selectedTrial.sequence && <p role="status">Recorded event attached to {attachment.runId}. Existing notes are retained; the position is a draft for discussion. <a href="#/simulator?panel=discussion">Review your reasoning →</a></p>}<p>Full request envelopes and before/after order or spend snapshots are not recorded in this view. No historical amount or state change is reconstructed from the browser model.</p>{variantCase && <div className="button-row"><button onClick={tryVariation}>Try a browser variation</button><span>Opens an illustrative preset; historical inputs and results are not copied.</span></div>}</> : <p className="empty">{requestedTrial !== null ? 'Choose a valid recorded trial below.' : 'No distinct recorded trial maps to this selection. An interactive illustration is not a substitute for missing execution evidence.'}</p>}
      </section>
      {selectedTrial && <TrialReplay key={selectedTrial.sequence} trial={selectedTrial}/>}
      <section className="notice"><h2>What remains unknown?</h2>{selectedTrial?.fault === 'stale_approval' ? <p>The recorded case tests an expired finance approval. It does not establish real quotation validity or a successful reapproval/recovery process. A current approval alone cannot establish that the price or demand is correct.</p> : selectedTrial?.fault === 'message_poisoning' ? <p>The recorded injection changes a context reference at <code>demand_mock</code>. The purchase-oriented browser illustration is related evidence, not the same execution or a live prompt-injection test.</p> : <p>{evidenceCase.limitation} The selected trial establishes only its recorded observations under the declared experiment conditions.</p>}<p>These A/B/C arms are selected control bundles, not a comparison of every conventional design against HAZOP. Tests and receipts do not establish that the complete system is safe.</p></section>
      <details className="panel trial-ledger" open={requestedTrial !== null && !exactTrial ? true : undefined}><summary>Browse and filter all 30 recorded trials</summary><h2>Explore the trial ledger</h2><div className="control-grid"><label><span id="recorded-arm-label">Filter recorded arm</span><select aria-labelledby="recorded-arm-label" value={arm} onChange={event => setArm(event.target.value)}><option value="all">All arms</option>{['A', 'B', 'C'].map(value => <option key={value}>{value}</option>)}</select></label><label><span id="recorded-sort-label">Sort recorded trials</span><select aria-labelledby="recorded-sort-label" value={sort} onChange={event => setSort(event.target.value)}><option value="sequence">Evidence sequence</option><option value="fault">Fault name</option></select></label></div><div className="table-scroll register"><table><caption>Sanitized frozen trial records; selecting a row changes inspection only</caption><thead><tr><th>Evidence</th><th>Arm / fault</th><th>Unsafe mutations / attack calls</th><th>Completed</th></tr></thead><tbody>{trials.map(trial => <tr key={trial.sequence} className={selectedTrial?.sequence === trial.sequence ? 'selected-row' : ''}><td><a href={routeLink('assurance', 'trial', String(trial.sequence))}>#{trial.sequence} · {trial.case_id}</a></td><td>{trial.configuration} / {trial.fault}</td><td>{trial.outcome.unsafe_mutations}/{trial.outcome.attack_attempts}</td><td>{String(trial.completed)}</td></tr>)}</tbody></table></div></details>
      <RecordedCharts/>
      <details className="panel"><summary>Experiment scope, coverage and source test index</summary><div className="stats"><Stat label="Recorded acceptance" value={`${acceptance.checks.length}/21`} note="Frozen passed checks; no current controller receipt"/><Stat label="Execution stages" value={`${stages.length}/9`} note="Recorded stage exits were zero"/><Stat label="Recorded trials" value="30/30" note="Workload files alone are inputs only"/><Stat label="Hazards approved" value="0" note="All 96 findings remain unverified"/></div><TestEvidence control={control}/></details>
    </>}
    <details className="panel" open={control ? true : undefined}><summary>Hazard, control and test traceability{control ? ` · ${control}` : ''}</summary><p>Requirements remain proposed. Implementation and test names describe frozen source mappings; they are not human acceptance or current execution claims.</p>{requirements.filter(requirement => !control || requirement.controls.some(item => item.id === control)).map(requirement => <details key={requirement.id} open={control ? true : undefined}><summary>{requirement.controls.map(item => item.id).join(' + ')} · {requirement.state}</summary><p><a href={routeLink('hazop', 'hazard', requirement.hazard_id)}>{requirement.hazard_id}</a> → {requirement.id}</p>{requirement.controls.map(item => <div key={item.id}><p><strong>{item.description}</strong> · {item.status}</p><p>Implementation: <code>{item.implementation}</code> · Test selector: <code>{item.test}</code></p><p>{item.gap}</p><a href={routeLink('governance', 'control', item.id)}>Inspect control →</a></div>)}</details>)}{control && <a href={routeLink('assurance')}>Show all proposed controls →</a>}</details>
    <details className="panel"><summary>Source lineage, methodology and trust limits</summary><p>Transformation: <code>{manifest.transformation_version}</code> · Selection: <code>{manifest.evidence_directory}</code></p><p>Execution provenance comes from the selected summary/dashboard/acceptance. Workload files define inputs only. Fixture checks verify committed snapshots and aggregates; a separate optional audit compares originals when present. Missing originals cannot be authenticated in a clean checkout.</p><div className="table-scroll"><table><caption>Raw source hashes, extraction selectors and committed snapshot hashes</caption><thead><tr><th>Fixture / source</th><th>Selector</th><th>SHA256</th></tr></thead><tbody>{Object.entries(manifest.sources).map(([id, source]) => <tr key={id}><td>{id}<small>{source.path}</small></td><td>{source.selector}</td><td className="mono">Raw: {source.raw_sha256}<br/>Snapshot: {source.snapshot_sha256}</td></tr>)}</tbody></table></div><details><summary>Recorded acceptance checks and stage results</summary><ul>{acceptance.checks.map(check => <li key={check.name}>{check.passed ? '✓' : '×'} {check.name}</li>)}</ul><ul>{stages.map(stage => <li key={stage.name}>{stage.name}: exit {stage.exit}</li>)}</ul></details><h3>Trust and measurement limitations</h3><ul>{acceptance.limitations.map(limit => <li key={limit}>{limit}</li>)}<li>Four matched pairs of OPA-only ablation timings cannot establish whole-stack overhead.</li><li>Oracle coverage is finite. Missing or unmeasured values are unknown, not zero.</li><li>Missing approval and excessive spending have no distinct recorded trial in this selection. Objective arbitration remains a gap.</li></ul></details>
  </>;
}
