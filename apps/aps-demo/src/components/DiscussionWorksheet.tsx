import { useState } from 'react';
import { emptyDiscussion } from '../domain/session.ts';
import type { DiscussionDraft } from '../domain/session.ts';
import { getCase } from '../domain/cases.ts';
import { useSession } from './SessionContext.tsx';
import { Badge } from './shared.tsx';

type Confirmation = 'load' | 'delete' | 'clear' | null;

function downloadBrief(contents: string, extension: 'json' | 'md') {
  const blob = new Blob([contents], { type: extension === 'json' ? 'application/json' : 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aps-discussion-brief.${extension}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DiscussionWorksheet() {
  const {
    selectedRun, runs, discussions, updateDiscussion, forkFreshApproval,
    saveLocal, loadLocal, deleteSaved, clearSession, storageMessage,
    exportJSON, exportMarkdown, configLink,
  } = useSession();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [feedback, setFeedback] = useState('');
  const draft = selectedRun ? discussions[selectedRun.id] ?? emptyDiscussion() : emptyDiscussion();
  const canFork = selectedRun?.caseId === 'stale'
    && selectedRun.request.approvalAge >= 60
    && selectedRun.results.C.decision === 'deny'
    && !selectedRun.results.C.executed;

  function edit(field: keyof Omit<DiscussionDraft, 'ready'>, value: string) {
    if (!selectedRun) return;
    updateDiscussion(selectedRun.id, { [field]: value, ready: false });
    setFeedback('');
  }

  function confirmAction() {
    if (confirmation === 'load') loadLocal();
    if (confirmation === 'delete') deleteSaved();
    if (confirmation === 'clear') clearSession();
    setConfirmation(null);
    setFeedback('');
  }

  function exportBrief(format: 'json' | 'md') {
    try {
      downloadBrief(format === 'json' ? exportJSON() : exportMarkdown(), format);
      setFeedback(`${format === 'json' ? 'JSON' : 'Markdown'} discussion brief downloaded. It includes retained comparisons and their local reasoning.`);
    } catch {
      setFeedback('The download could not be created. Your discussion remains in this session.');
    }
  }

  return <section className="panel discussion-worksheet" id="discussion" tabIndex={-1} aria-labelledby="discussion-title">
    <div className="section-title">
      <div><p className="eyebrow">HUMAN REASONING</p><h2 id="discussion-title">What should happen next?</h2></div>
      <Badge>Discussion only · no authority</Badge>
    </div>
    <p>Explain a recommendation, the evidence behind it, and what would change your mind. These notes do not approve a hazard, change a policy, or authorize a purchase.</p>

    {selectedRun ? <>
      <div className="discussion-context">
        <strong>{getCase(selectedRun.caseId).title}</strong>
        <p>Reasoning for <code>{selectedRun.id}</code> · {selectedRun.request.amount} sandbox units · approval age {selectedRun.request.approvalAge} logical seconds.</p>
        <p>Model B: {selectedRun.results.B.decision.toUpperCase()} · Model C: {selectedRun.results.C.decision.toUpperCase()}. Selecting another run opens its own worksheet.</p>
      </div>
      <div className="discussion-perspectives">
        <article><h3>Procurement perspective</h3><p>The requested work still needs a response. A blocked action can leave the purchase outstanding.</p></article>
        <article><h3>Finance perspective</h3><p>Authority must apply to this action at the time it is attempted. A prior approval may no longer be valid.</p></article>
      </div>
      <form onSubmit={event => {
        event.preventDefault();
        if (!draft.rationale.trim()) {
          setFeedback('Add a rationale before marking this position ready for discussion. Incomplete drafts are retained.');
          return;
        }
        updateDiscussion(selectedRun.id, { ready: true });
        setFeedback('Position marked ready for discussion. This does not change either modeled outcome.');
      }}>
        <div className="discussion-fields">
          <label className="discussion-wide"><span id="discussion-recommendation-label">Recommended next action</span>
            <select aria-labelledby="discussion-recommendation-label" value={draft.recommendation} onChange={event => edit('recommendation', event.target.value)}>
              <option value="">Choose a response, or leave this draft unresolved</option>
              <option value="Obtain a new matching approval">Hold the purchase and obtain a new matching approval</option>
              <option value="Gather more information">Check the quotation or demand before proposing a new attempt</option>
              <option value="Propose a policy revision">Propose a different expiry policy for later review</option>
              <option value="Insufficient evidence">Insufficient evidence to recommend proceeding</option>
              <option value="Unresolved disagreement">Leave the decision unresolved and record disagreement</option>
            </select>
          </label>
          <label className="discussion-wide"><span id="discussion-rationale-label">Reason for this recommendation</span>
            <textarea aria-labelledby="discussion-rationale-label" rows={3} value={draft.rationale} onChange={event => edit('rationale', event.target.value)} placeholder="Which condition matters, and why does it support your next action?"/>
          </label>
          <label><span id="discussion-evidence-label">Supporting evidence</span>
            <textarea aria-labelledby="discussion-evidence-label" rows={3} value={draft.evidence} onChange={event => edit('evidence', event.target.value)} placeholder="Name a check, a recorded trial, or evidence that is still needed."/>
          </label>
          <label><span id="discussion-assumptions-label">Assumptions</span>
            <textarea aria-labelledby="discussion-assumptions-label" rows={3} value={draft.assumptions} onChange={event => edit('assumptions', event.target.value)} placeholder="For example: the approval matches the request; the quotation is accurate."/>
          </label>
          <label><span id="discussion-question-label">What remains unknown?</span>
            <textarea aria-labelledby="discussion-question-label" rows={3} value={draft.question} onChange={event => edit('question', event.target.value)} placeholder="What evidence would change your recommendation?"/>
          </label>
          <label><span id="discussion-dissent-label">Dissent or another interpretation</span>
            <textarea aria-labelledby="discussion-dissent-label" rows={3} value={draft.dissent} onChange={event => edit('dissent', event.target.value)} placeholder="Keep a competing explanation or unresolved disagreement visible."/>
          </label>
        </div>
        <div className="button-row">
          <button type="submit">Mark ready for discussion</button>
          <span>{draft.ready ? 'Ready for discussion · not approval' : 'Draft · changes retained in this session'}</span>
        </div>
      </form>

      {canFork && <div className="notice recovery-exploration">
        <h3>Explore a possible next attempt</h3>
        <p>Start both comparison lanes from C’s unchanged state with a new request identity and a fresh matching approval. Assume the task and context remain valid. This preserves the denied attempt and does not continue B’s already executed purchase.</p>
        <p><strong>Hypothetical recovery; not demonstrated by the recorded trial.</strong> The browser does not issue a finance approval.</p>
        <button type="button" onClick={() => { forkFreshApproval(); setFeedback('A new hypothetical comparison starts from C’s no-effect state. The original comparison and its discussion are retained.'); }}>Explore a fresh-approval request</button>
      </div>}
      <div className="notice residual-question"><strong>Passing the modeled checks leaves a question open</strong><p>Even with a fresh approval, what establishes that the quotation, stock record, or underlying demand is correct?</p></div>
    </> : <div className="empty"><p>Run a comparison to attach a recommendation to its exact inputs and outcomes. You can also load an explicitly saved local session below.</p><a className="button" href="#/simulator">Open the Case Lab →</a></div>}

    <details className="discussion-session-tools">
      <summary>Keep or export this discussion</summary>
      <p>Notes stay in memory unless you explicitly save them in this browser. Exports include all {runs.length} retained comparison{runs.length === 1 ? '' : 's'}, their input snapshots, predictions, branch relationships, and discussion drafts. No data is sent to a server.</p>
      <div className="button-row">
        <button type="button" disabled={!runs.length} onClick={() => exportBrief('md')}>Download discussion brief</button>
        <button type="button" disabled={!runs.length} onClick={() => exportBrief('json')}>Download session JSON</button>
        <button type="button" onClick={saveLocal}>Save in this browser</button>
        <button type="button" onClick={() => setConfirmation('load')}>Load saved session</button>
        <button type="button" onClick={() => setConfirmation('delete')}>Delete browser copy</button>
        <button type="button" onClick={() => setConfirmation('clear')}>Clear current session</button>
      </div>
      {configLink ? <p><a href={configLink}>Open configuration-only link →</a></p>
        : <p className="muted">Correct the draft inputs before creating a configuration-only link.</p>}
      <p className="muted">This link carries the current draft’s case and bounded inputs only. It contains no notes, recorded outcomes, or approvals. Downloads and browser copies retain your free-text discussion.</p>
      {confirmation && <div className="notice session-confirmation" role="group" aria-label="Confirm session action">
        <p>{confirmation === 'load'
          ? 'Loading replaces the current in-memory session with the browser copy. Export any unsaved discussion you want to keep first.'
          : confirmation === 'delete'
            ? 'Delete the saved browser copy? The current in-memory discussion will remain available.'
            : 'Clear all current comparisons, predictions, and notes? Your separately saved browser copy will remain available.'}</p>
        <div className="button-row"><button type="button" onClick={confirmAction}>{confirmation === 'load' ? 'Replace with saved session' : confirmation === 'delete' ? 'Delete saved copy' : 'Clear comparisons and notes'}</button><button type="button" onClick={() => setConfirmation(null)}>Cancel</button></div>
      </div>}
      {storageMessage && <p role="status">{storageMessage}</p>}
    </details>
    {feedback && <p className="worksheet-feedback" role="status">{feedback}</p>}
  </section>;
}
