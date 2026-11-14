import { useState } from 'react';
import { emptyDiscussion } from '../domain/session.ts';
import type { DiscussionDraft } from '../domain/session.ts';
import { getCase } from '../domain/cases.ts';
import { routeLink } from '../data.ts';
import { runTitle } from '../domain/presentation.ts';
import type { ComparisonRun } from '../domain/comparison.ts';
import { useSession } from './SessionContext.tsx';
import { Badge } from './shared.tsx';

type Confirmation = 'load' | 'delete' | 'clear' | null;

function investigationFor(run: ComparisonRun) {
  if (run.caseId === 'conflict') return {
    perspectives: [['Procurement perspective', 'Speed and availability matter, but proceeding may commit the team to a choice finance cannot support.'], ['Finance perspective', 'Budget and authorization matter, but a hold leaves the procurement objective unresolved.']],
    primary: ['Clarify competing objectives', 'Clarify the competing objectives and who can resolve them'],
    gatherLabel: 'Gather the constraints and evidence needed to compare the objectives',
    gatherTitle: 'Ask what would make a trade-off acceptable',
    question: 'Which objective takes priority, what constraints are non-negotiable, and who has authority to resolve the disagreement?',
    gatherDetail: 'Record the competing objectives, their owners and the evidence needed to compare them. The recorded budget case does not demonstrate objective arbitration.',
    policyLabel: 'Propose an objective-review process for later review',
    policyQuestion: 'What escalation process and accountable decision owner should handle conflicting objectives? This proposal does not resolve them.',
    residual: 'A review request does not decide which objective should win. What evidence and accountable judgment would justify a resolution?',
  };
  if (run.caseId === 'context') return {
    perspectives: [['Purchase perspective', 'The worker needs usable information for this purchase, but receiving information does not establish that it belongs to this task.'], ['Provenance perspective', 'Task binding needs a trustworthy origin and scope; repeating the same claim does not verify either.']],
    primary: ['Resolve task provenance', 'Establish the correct task and trusted source before another attempt'],
    gatherLabel: 'Investigate the task mismatch and information source',
    gatherTitle: 'Request evidence of task provenance',
    question: 'Which task does this information belong to, which trusted source establishes that binding, and what must be corrected before another attempt?',
    gatherDetail: 'Identify the expected task, the supplied context and the trusted source of their relationship. The related recorded case changes context at demand, not this purchase boundary.',
    policyLabel: 'Propose a provenance-checking process for later review',
    policyQuestion: 'What source may establish task binding, and what should happen when provenance cannot be checked?',
    residual: 'A matching task reference does not establish that its contents are true. What independent source supports the information?',
  };
  if (run.caseId === 'unauthorized') return {
    perspectives: [['Supplier perspective', 'The supplier may supply a quotation, but that role does not authorize purchase execution.'], ['Purchase perspective', 'An authorized purchase worker needs a valid request and the appropriate approvals before acting.']],
    primary: ['Restore role boundaries', 'Identify the authorized role and preserve the supplier boundary'],
    gatherLabel: 'Check the intended actor, tool scope and request origin',
    gatherTitle: 'Investigate who may perform this operation',
    question: 'Which role should submit this purchase, and what trusted evidence establishes that role and its permitted tools?',
    gatherDetail: 'Trace why a supplier-origin request reached the purchase tool. Identify the authorized route without granting the supplier broader access or treating a referral as approval.',
    policyLabel: 'Propose a role-boundary change for later review',
    policyQuestion: 'What role separation and request routing should prevent a supplier from executing a purchase?',
    residual: 'Correct tool scope does not establish a valid purchase. What additional authorization and business facts are required?',
  };
  if (run.caseId === 'spending') return {
    perspectives: [['Procurement perspective', 'The proposed amount may reflect a need, an incorrect quantity or a stale price. Its basis needs examination.'], ['Budget perspective', 'The request exceeds the modeled ceiling. A rationale alone cannot waive that constraint.']],
    primary: ['Review the proposed amount', 'Verify the amount and scope before proposing another request'],
    gatherLabel: 'Gather the quantity, quotation and budget basis',
    gatherTitle: 'Investigate why the amount exceeds the ceiling',
    question: 'What quantity and quotation support this amount, and can the intended work fit within the authorized budget?',
    gatherDetail: 'Check the amount against the underlying need, quotation and budget. Record whether the request needs correction or an accountable budget review; this app does not revise the ceiling.',
    policyLabel: 'Propose a budget-control change for later review',
    policyQuestion: 'What evidence and accountable review would justify changing the spend ceiling without bypassing authorization?',
    residual: 'Being within a ceiling would not establish that the purchase is necessary or correctly priced.',
  };
  if (run.caseId === 'replay') return {
    perspectives: [['Delivery perspective', 'A missing or delayed response can leave uncertainty about whether work completed.'], ['Uniqueness perspective', 'A reused request identity can duplicate an effect; another attempt needs reconciliation first.']],
    primary: ['Reconcile the prior attempt', 'Check the prior request and its receipt before another attempt'],
    gatherLabel: 'Gather the original request identity and completion evidence',
    gatherTitle: 'Reconcile what happened to the prior attempt',
    question: 'What receipt or authoritative state establishes whether the original request already executed?',
    gatherDetail: 'Look for the original request identity and completion evidence. Do not assume that a missing response means no effect, or that a new identity makes a repeated action safe.',
    policyLabel: 'Propose a replay-handling process for later review',
    policyQuestion: 'How should request identity, receipts and reconciliation prevent duplicate effects when responses are uncertain?',
    residual: 'A denied duplicate does not by itself establish the original business outcome; that needs separate evidence.',
  };
  if (run.caseId === 'delegation') return {
    perspectives: [['Task perspective', 'Delegation should move work toward a bounded objective rather than circulate responsibility.'], ['Execution perspective', 'The chain has exceeded its allowed depth; continuing requires understanding where responsibility or the stop condition was lost.']],
    primary: ['Inspect the delegation chain', 'Identify the responsible owner and a bounded delegation plan'],
    gatherLabel: 'Inspect the delegation chain and its stopping condition',
    gatherTitle: 'Find why delegation did not terminate',
    question: 'Which worker owns completion, why was work delegated again, and what stop condition should bound the chain?',
    gatherDetail: 'Identify the task owner, delegation chain and stopping condition. A higher depth limit alone does not establish that the work will terminate or remain within budget.',
    policyLabel: 'Propose a delegation-boundary change for later review',
    policyQuestion: 'What ownership, depth and resource constraints would bound delegation while allowing the task to finish?',
    residual: 'Stopping a chain leaves its task unresolved. What evidence supports a bounded way to finish it?',
  };
  return {
    perspectives: [['Procurement perspective', 'The requested work still needs a response. A blocked action can leave the purchase outstanding.'], ['Finance perspective', 'Authority must apply to this action at the time it is attempted. A prior approval may no longer be valid.']],
    primary: !run.request.approved || run.request.approvalAge >= 60
      ? ['Obtain a new matching approval', 'Hold the purchase and obtain a new matching approval']
      : ['Verify business inputs', 'Verify business inputs before treating the purchase as complete'],
    gatherLabel: run.results.C.executed ? 'Check the quotation, stock record and demand behind the permitted request' : 'Check the quotation or demand before proposing a new attempt',
    gatherTitle: 'Request the missing business evidence',
    question: 'Who can confirm that the quotation, stock record and underlying demand are still valid for this purchase?',
    gatherDetail: 'Ask for a current quotation and the source of the demand or stock record. This app has no live quotation feed; the question remains unresolved until evidence is supplied outside this illustration.',
    policyLabel: run.caseId === 'stale' ? 'Propose a different expiry policy for later review' : 'Propose a change to the relevant control for later review',
    policyQuestion: run.caseId === 'stale' ? 'What evidence would justify a different approval lifetime, and who should review its risks? The fixed 60-second rule is unchanged.' : 'Which request condition needs a different control, what evidence supports the proposal, and who should review it?',
    residual: 'Even with passing checks, what establishes that the quotation, stock record, or underlying demand is correct?',
  };
}

function decisiveEvidence(run: ComparisonRun) {
  const failed = run.results.C.checks.find(check => check.status === 'fail');
  const observation = failed ? `C check ${failed.rule}: ${failed.status} — ${failed.reason}.` : `No C check failed. Reached checks: ${run.results.C.checks.filter(check => check.status === 'pass').map(check => check.rule).join(', ')}.`;
  return `Illustrative comparison ${run.id} (${run.requestIdentity}): B ${run.results.B.decision}; C ${run.results.C.decision}. ${observation} This is browser-model evidence, not a recorded trial or operational authorization.`;
}

function appendDistinct(existing: string, addition: string) {
  return existing.includes(addition) ? existing : [existing.trimEnd(), addition].filter(Boolean).join('\n\n');
}


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
    selectedRun, runs, discussions, updateDiscussion, forkFreshApproval, isDirty, selectRun,
    saveLocal, loadLocal, deleteSaved, clearSession, storageMessage,
    exportJSON, exportMarkdown, configLink,
  } = useSession();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [feedback, setFeedbackState] = useState<{ runId?: string; text: string }>({ text: '' });
  const setFeedback = (text: string) => setFeedbackState({ runId: selectedRun?.id, text });
  const draft = selectedRun ? discussions[selectedRun.id] ?? emptyDiscussion() : emptyDiscussion();
  const investigation = selectedRun ? investigationFor(selectedRun) : null;
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
        <strong>{runTitle(selectedRun)}</strong>
        <p>Reasoning for <code>{selectedRun.id}</code> · {selectedRun.request.amount} sandbox units · approval age {selectedRun.request.approvalAge} logical seconds.</p>
        <p>Model B: {selectedRun.results.B.decision.toUpperCase()} · Model C: {selectedRun.results.C.decision.toUpperCase()}. Selecting another run opens its own worksheet.</p>
      </div>
      {isDirty && <div className="notice discussion-snapshot-notice"><p>Your inputs have changed. This position still belongs to <strong>{selectedRun.id}</strong> and its retained outcomes, not the unevaluated inputs.</p><button type="button" onClick={() => { selectRun(selectedRun.id); setFeedback('Restored the inputs for this retained comparison.'); }}>Use this comparison’s inputs</button></div>}
      <div className="discussion-perspectives">
        {investigation!.perspectives.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
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
              <option value={investigation!.primary[0]}>{investigation!.primary[1]}</option>
              <option value="Gather more information">{investigation!.gatherLabel}</option>
              <option value="Propose a policy revision">{investigation!.policyLabel}</option>
              <option value="Insufficient evidence">Insufficient evidence to recommend proceeding</option>
              <option value="Unresolved disagreement">Leave the decision unresolved and record disagreement</option>
              {draft.recommendation && ![investigation!.primary[0], 'Gather more information', 'Propose a policy revision', 'Insufficient evidence', 'Unresolved disagreement'].includes(draft.recommendation) && <option value={draft.recommendation}>Saved recommendation: {draft.recommendation}</option>}
            </select>
          </label>
      <section className="notice investigation-next-step discussion-wide" aria-labelledby="investigation-next-title">
        <p className="eyebrow">YOUR NEXT STEP</p>
        {draft.recommendation === 'Obtain a new matching approval' ? <>
          <h3 id="investigation-next-title">Explore what a new matching approval would change</h3>
          {canFork ? <><p>Start both comparison lanes from C’s unchanged state with a new request identity and a fresh matching approval. Assume the task and context remain valid. The denied attempt and its discussion remain available.</p><p><strong>Hypothetical recovery; not demonstrated by the recorded trial.</strong> This app cannot issue finance approval or continue B’s already executed purchase.</p><button type="button" disabled={isDirty} onClick={() => { forkFreshApproval(); setFeedback('A new hypothetical comparison starts from C’s no-effect state. The original comparison and its discussion are retained.'); }}>Explore a fresh-approval request</button>{isDirty && <p>Restore this comparison’s inputs above before exploring its recovery.</p>}</> : <p>This comparison has no modeled fresh-approval recovery branch. {selectedRun.caseId === 'stale' ? 'Its approval is already current; renewing it would not answer the remaining business questions.' : 'Identify the failed request condition and the authority needed before proposing another attempt.'} No new approval or outcome is created.</p>}
        </> : draft.recommendation === 'Gather more information' || draft.recommendation === investigation!.primary[0] ? <>
          <h3 id="investigation-next-title">{investigation!.gatherTitle}</h3><p>{investigation!.gatherDetail}</p>
          <p><strong>Evidence request · unresolved:</strong> {investigation!.question}</p><button type="button" onClick={() => { edit('question', appendDistinct(draft.question, investigation!.question)); setFeedback('Added an unresolved evidence request to this position. No evidence has been obtained or verified.'); }}>Add this evidence request to my position</button>
          <p><a href={routeLink('assurance', 'story', selectedRun.caseId)}>Inspect the related recorded evidence →</a></p>
        </> : draft.recommendation === 'Propose a policy revision' ? <>
          <h3 id="investigation-next-title">Frame a proposal for human review</h3><p>{investigation!.policyQuestion}</p><p>A proposal does not alter either control bundle or resolve an outstanding condition.</p><button type="button" onClick={() => { edit('question', appendDistinct(draft.question, investigation!.policyQuestion)); setFeedback('Added the policy-review question. The modeled rules and outcomes are unchanged.'); }}>Add this policy-review question</button><p><a href={routeLink('governance', 'control', getCase(selectedRun.caseId).control)}>Inspect the relevant control and its limits →</a></p>
        </> : draft.recommendation === 'Insufficient evidence' || draft.recommendation === 'Unresolved disagreement' ? <>
          <h3 id="investigation-next-title">Keep the decision open</h3><p>{draft.recommendation === 'Unresolved disagreement' ? 'Record the competing interpretation and identify who needs to participate in resolving it.' : 'Name the missing observation and who could provide it before proposing that work proceeds.'}</p><p>{investigation!.question}</p><button type="button" onClick={() => { edit('question', appendDistinct(draft.question, investigation!.question)); setFeedback('Retained the open question. Neither modeled outcome has changed.'); }}>Keep this open question in my position</button>
        </> : <><h3 id="investigation-next-title">Choose an investigation to continue</h3><p>Select a recommendation above to see the information, review or hypothetical exploration it calls for. You can also leave the position unresolved.</p></>}
      </section>
          <label className="discussion-wide"><span id="discussion-rationale-label">Reason for this recommendation</span>
            <textarea aria-labelledby="discussion-rationale-label" rows={3} value={draft.rationale} onChange={event => edit('rationale', event.target.value)} placeholder="Which observation supports your next action, and why?"/>
          </label>
          <label className="discussion-wide"><span id="discussion-question-label">What remains unknown?</span><small>What would change your mind?</small>
            <textarea aria-labelledby="discussion-question-label" rows={2} value={draft.question} onChange={event => edit('question', event.target.value)} placeholder={investigation!.question}/>
          </label>
        </div>
        <div className="evidence-attachment"><button type="button" onClick={() => { edit('evidence', appendDistinct(draft.evidence, decisiveEvidence(selectedRun))); setFeedback(`Attached the modeled check and comparison identity from ${selectedRun.id}. Existing evidence notes are retained.`); }}>Attach this comparison’s decisive check</button><p>Attach the observed modeled check to your position. This does not add recorded or external evidence.</p></div>
        <details className="reasoning-more"><summary>Inspect supporting evidence</summary>
          <label><span id="discussion-evidence-label">Supporting evidence</span><textarea aria-labelledby="discussion-evidence-label" rows={4} value={draft.evidence} onChange={event => edit('evidence', event.target.value)} placeholder="Attach a modeled check or name the source you inspected. Distinguish observations from evidence still needed."/></label>
        </details>
        <details className="reasoning-more"><summary>Record assumptions or disagreement</summary><div className="discussion-fields">
          <label><span id="discussion-assumptions-label">Assumptions</span><textarea aria-labelledby="discussion-assumptions-label" rows={3} value={draft.assumptions} onChange={event => edit('assumptions', event.target.value)} placeholder="Which conditions are you taking as given?"/></label>
          <label><span id="discussion-dissent-label">Dissent or another interpretation</span><textarea aria-labelledby="discussion-dissent-label" rows={3} value={draft.dissent} onChange={event => edit('dissent', event.target.value)} placeholder="Keep a competing explanation or unresolved disagreement visible."/></label>
        </div></details>
        <div className="button-row"><button type="submit">Mark ready for discussion</button><span>{draft.ready ? 'Ready for discussion · not approval' : 'Draft · changes retained in this session'}</span></div>
      </form>

      <section className="position-summary" aria-labelledby="position-summary-title"><h3 id="position-summary-title">Your position for discussion</h3><dl><div><dt>Next action</dt><dd>{draft.recommendation || 'Unresolved'}</dd></div><div><dt>Reason</dt><dd>{draft.rationale || 'No rationale recorded'}</dd></div><div><dt>Evidence</dt><dd>{draft.evidence ? <>{draft.evidence.length > 240 ? `${draft.evidence.slice(0,240)}…` : draft.evidence}{draft.evidence.length > 240 && <details><summary>Read full attached evidence</summary><p>{draft.evidence}</p></details>}</> : 'No supporting evidence attached'}</dd></div><div><dt>Open question</dt><dd>{draft.question || 'No open question recorded'}</dd></div></dl><p className="position-gaps">{[!draft.recommendation && 'Recommendation unresolved', !draft.evidence.trim() && 'Evidence not yet attached', !draft.question.trim() && 'State what would change your mind'].filter(Boolean).join(' · ') || 'Evidence and an open question are recorded; their quality and resolution still need human review.'}</p><p>This position belongs to {selectedRun.id}. Marking it ready invites discussion; it does not verify the evidence or authorize an action.</p></section>
      <div className="notice residual-question"><strong>Passing the modeled checks leaves a question open</strong><p>{investigation!.residual}</p></div>
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
    {feedback.runId === selectedRun?.id && feedback.text && <p className="worksheet-feedback" role="status">{feedback.text}</p>}
  </section>;
}
