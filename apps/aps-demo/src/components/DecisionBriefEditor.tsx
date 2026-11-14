import { useState } from 'react';
import { MAX_BRIEF_BYTES, exportDecisionBrief } from '../decisionBrief.ts';
import { selectWorkflow } from '../workflow/index.ts';
import type { WorkflowState } from '../workflow/index.ts';
import type { DecisionBriefController } from './useDecisionBrief.ts';

export function DecisionBriefEditor({ state, brief }: { state: WorkflowState; brief: DecisionBriefController }) {
  const [exportText, setExportText] = useState('');
  const [importText, setImportText] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const v = selectWorkflow(state);
  const snapshot = brief.draft?.snapshot;
  const notes = brief.notes;
  const exportStale = !!exportText && !!brief.draft && exportText !== exportDecisionBrief(brief.draft);
  function prepare() { const text = brief.prepareExport(); setExportText(text); setTransferMessage(text ? 'Export prepared. The JSON contains a discussion snapshot, not verified evidence or approval.' : ''); return text; }
  function download() {
    const text = prepare(); if (!text) return;
    try {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'aps-decision-brief.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setTransferMessage('File download is unavailable. Copy the prepared JSON below to retain your draft.'); }
  }
  async function readFile(file: File | undefined) {
    if (!file) return;
    brief.cancelImport(); setTransferMessage('');
    if (file.size > MAX_BRIEF_BYTES) { setTransferMessage('Brief exceeds the 128 KiB limit. Current draft retained.'); return; }
    try { const text = await file.text(); setImportText(text); brief.previewImport(text); }
    catch { setTransferMessage('Could not read this file. Current draft retained.'); }
  }
  return <section className="panel learning-section leadership-brief" aria-label="Leadership decision brief">
    <p className="eyebrow">WORKING BRIEF · NOT AN APPROVAL</p><h2>Take a clear decision back to your team</h2>
    <p>APS examines failures across agent handoffs, connects safeguards to consequential actions, and asks for evidence of acceptable outcomes. HAZOP structures the analysis; enforcement and assurance are separate activities.</p>
    <p role="status" aria-label="Brief save status">{brief.saved ? 'Saved in this browser.' : brief.draft ? 'Unsaved changes. Save locally or export before closing or reloading.' : 'No draft saved yet. Add notes or attach observations to begin.'}</p>
    {brief.message && <p role="status" aria-label="Brief action status">{brief.message}</p>}
    {brief.storageConflict && <section className="notice brief-interaction" aria-label="Saved brief conflict"><h3>The saved browser copy has changed</h3><p>Your working notes are retained. Save and discard will not overwrite the changed copy. Download your working brief before reviewing that copy or reloading.</p><button onClick={() => { brief.previewSaved(); setTransferOpen(true); }}>Preview saved browser copy</button></section>}
    {snapshot && <p role="status" aria-label="Brief observation status">{brief.stale ? 'The run has changed—review this brief again. Its attached observations are retained; they do not describe the current run.' : 'Notes and discussion refer to the attached observations from this run.'}</p>}
    {brief.imported && <p>Restored or imported discussion data is unverified. Source labels and metrics are supplied data, not authenticated evidence. Import never resumes or changes a workflow.</p>}
    <dl><dt>Business objective</dt><dd>Maintain supply continuity without unauthorized or duplicate commitments. Delivery is outside this model.</dd>
      <dt>{snapshot ? 'Attached observation' : 'Current observation'}</dt><dd>{snapshot ? `${snapshot.scenario} · configuration ${snapshot.mode} · ${snapshot.orders} orders · ${snapshot.spend} simulated units · confirmation ${snapshot.confirmed ? 'supported' : 'not established'} · unsafe effects ${snapshot.unsafe} · model checks with confirmation ${snapshot.safeCompleted ? 'satisfied' : 'not established'}.` : `${v.scenarioTitle} · configuration ${state.spec.mode} · ${v.metrics.committedOrders} orders · ${v.metrics.spent} simulated units · confirmation ${v.metrics.completed ? 'supported' : 'not established'} · unsafe effects ${v.metrics.unsafeCommittedEffects} · model checks with confirmation ${v.metrics.safeCompleted ? 'satisfied' : 'not established'}.`}</dd>
      <dt>Required safeguards to specify</dt><dd>Authority for the exact purchase at commitment; one commitment per intent; reconciliation before retry; an accountable exception owner.</dd>
      <dt>Benefits and costs to measure</dt><dd>Hypotheses: fewer unauthorized or duplicate commitments and clearer accountability. Measure exception rate, review effort, completion, delay and recovery time. No ROI or production effectiveness is established here.</dd>
      <dt>Remaining uncertainty</dt><dd>Real identity, integrations, delivery, residual risk and control effectiveness require separate evaluation. Frozen experiment results do not validate this active run.</dd>
    </dl>
    <label>Proposed accountable role<input value={notes.owner} onChange={e => brief.edit('owner', e.target.value)} placeholder="Unassigned — name a role for discussion" maxLength={200}/></label>
    <label>Proposed next decision<textarea value={notes.decision} onChange={e => brief.edit('decision', e.target.value)} maxLength={2000}/></label>
    <label>Evidence needed before that decision<textarea value={notes.evidence} onChange={e => brief.edit('evidence', e.target.value)} maxLength={2000}/></label>
    <div className="brief-print"><p><strong>Proposed role:</strong> {notes.owner || 'Unassigned'}</p><p><strong>Next decision:</strong> {notes.decision}</p><p><strong>Evidence needed:</strong> {notes.evidence}</p>{snapshot && <p className="brief-source-print">Discussion draft, not approval. Captured {snapshot.capturedAt}; run instance {snapshot.runId}; observation {snapshot.observationId}; model {snapshot.modelVersion}; source baseline {snapshot.sourceBaseline}. {brief.imported ? 'Restored/imported data is unverified.' : 'Local browser observation; not an authenticated receipt.'}</p>}</div>
    <p><strong>Discussion position:</strong> {brief.draft?.position || 'Not selected. Use the discussion choices below.'}</p>
    {snapshot && <details><summary>Attached observation and source context</summary><p>Captured {snapshot.capturedAt}. Task {snapshot.taskId} · {snapshot.status} · {snapshot.transitionCount} transitions. Run instance {snapshot.runId}; observation {snapshot.observationId}. These identifiers only keep local drafts separate; they do not authenticate a run.</p><p>Browser model {snapshot.modelVersion}. Implementation baseline <a href={`https://github.com/SafetyMP/Agentic-Process-Safety/tree/${snapshot.sourceBaseline}`}>{snapshot.sourceBaseline}</a>; this is the model's documented source baseline, not a claim about a deployed build. No recorded experiment is attached or revalidated.</p><p>Order IDs: {snapshot.orderIds.join(', ') || 'none'}. Decision/effect event IDs: {snapshot.eventIds.join(', ') || 'none'}. Selected event: {snapshot.selectedEventId ?? 'none'}.</p><pre>{JSON.stringify(snapshot.spec, null, 2)}</pre></details>}
    <p>{brief.persistent ? 'Notes stay with this brief while you inspect other modules. Save locally to retain one draft in this browser after reload, or export a portable copy. Unsaved changes are lost on reload. Local saving does not share the draft with anyone.' : 'This embedded brief retains notes only while mounted. Export a copy before leaving.'} No person is assigned or approval issued.</p>
    <div className="button-row"><button onClick={brief.attach}>{snapshot ? 'Replace attached observations with current run' : 'Attach current observations'}</button>{brief.persistent && <button onClick={brief.save}>Save brief locally</button>}<button onClick={download}>Download decision brief</button><button onClick={() => window.print()}>Print leadership brief</button><button disabled={!brief.draft} onClick={brief.requestDiscard}>Discard brief…</button></div>
    {brief.discardPending && <section className="notice brief-interaction" aria-label="Confirm brief discard"><h3>Discard this brief?</h3><p>This removes the working draft and its saved local copy. Export a copy first if you need it. Your workflow and frozen evidence are unaffected.</p><button onClick={() => { if (brief.discard()) { setExportText(''); setImportText(''); setTransferMessage(''); } }}>Discard working and saved brief</button><button onClick={brief.cancelDiscard}>Keep brief</button></section>}
    <details className="brief-interaction" open={transferOpen} onToggle={e => setTransferOpen(e.currentTarget.open)}><summary>Export or import a decision brief</summary><p>Only simulation discussion drafts in the APS version 1 format are accepted, up to 128 KiB. Imported text and observations are unverified. A valid format does not establish their truth.</p>
      <button onClick={prepare}>Prepare brief JSON</button>{exportText && <><label>Prepared brief JSON<textarea readOnly value={exportText}/></label>{exportStale && <p>These are previously prepared contents. Prepare or download again to include your current edits.</p>}</>}
      <label>Import brief file<input type="file" accept="application/json,.json" onChange={e => { void readFile(e.target.files?.[0]); e.target.value = ''; }}/></label>
      <label>Brief JSON to import<textarea value={importText} onChange={e => { setImportText(e.target.value); brief.cancelImport(); }} maxLength={MAX_BRIEF_BYTES}/></label><button onClick={() => brief.previewImport(importText)}>Preview brief import</button>
      {transferMessage && <p role="status" aria-label="Brief transfer status">{transferMessage}</p>}
      {brief.pendingImport && <section className="notice" aria-label="Brief import preview"><h3>Replace the working draft?</h3><p>Incoming draft: {brief.pendingImport.notes.owner || 'Unassigned role'} · {brief.pendingImport.snapshot.scenario} · captured {brief.pendingImport.snapshot.capturedAt}. Decision: {brief.pendingImport.notes.decision}</p><p>Confirming replaces the current working notes and attached snapshot. Your saved local copy and active run stay unchanged until you explicitly save. Export your current draft first to retain it.</p><button onClick={brief.confirmImport}>Replace working brief with import</button><button onClick={brief.cancelImport}>Cancel brief import</button></section>}
    </details>
  </section>;
}
