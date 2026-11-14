import { useEffect, useState } from 'react';
import type { WorkflowState } from '../workflow/index.ts';
import type { Selection } from './PurchasingOperations.tsx';
import { BRIEF_STORAGE_KEY, captureBriefSnapshot, createDecisionBrief, defaultBriefNotes, discussionPositions, exportDecisionBrief, importDecisionBrief, newBriefIdentity } from '../decisionBrief.ts';
import type { DecisionBrief } from '../decisionBrief.ts';

type Options = { persistent?: boolean; runId?: string };
function restore(persistent: boolean) {
  if (!persistent) return { draft: null as DecisionBrief | null, savedText: '', storedText: null as string | null, message: '' };
  try {
    const text = localStorage.getItem(BRIEF_STORAGE_KEY);
    if (!text) return { draft: null as DecisionBrief | null, savedText: '', storedText: text, message: '' };
    const result = importDecisionBrief(text);
    return result.ok ? { draft: result.brief, savedText: exportDecisionBrief(result.brief), storedText: text, message: 'Saved local draft restored. Its observations belong to the earlier run; review before reusing.' }
      : { draft: null as DecisionBrief | null, savedText: '', storedText: text, message: `Saved brief could not be loaded: ${result.message} The stored text has not been changed.` };
  } catch { return { draft: null as DecisionBrief | null, savedText: '', storedText: null as string | null, message: 'Local storage is unavailable. Keep this page open and export your draft.' }; }
}
/** No persistence unless the owning application opts in. No workflow command is issued here. */
export function useDecisionBrief(state: WorkflowState, selection: Selection | null, options: Options = {}) {
  const [localRunId] = useState(newBriefIdentity);
  const runId = options.runId ?? localRunId;
  const [observation, setObservation] = useState(() => ({ state, id: newBriefIdentity() }));
  if (observation.state !== state) setObservation({ state, id: newBriefIdentity() });
  const [restored] = useState(() => restore(!!options.persistent));
  const [draft, setDraft] = useState<DecisionBrief | null>(restored.draft);
  const [savedText, setSavedText] = useState(restored.savedText);
  const [storedText, setStoredText] = useState(restored.storedText);
  const [storageConflict, setStorageConflict] = useState(false);
  const [message, setMessage] = useState(restored.message);
  const [imported, setImported] = useState(!!restored.draft);
  const [pendingImport, setPendingImport] = useState<DecisionBrief | null>(null);
  const [pendingSavedText, setPendingSavedText] = useState<string | null>(null);
  const [discardPending, setDiscardPending] = useState(false);
  useEffect(() => {
    if (!options.persistent) return;
    function changed(event: StorageEvent) {
      if ((event.key === BRIEF_STORAGE_KEY || event.key === null) && event.newValue !== storedText) {
        setStorageConflict(true); setMessage('The saved browser copy changed in another tab. Your working draft is retained. Export it before reviewing the saved copy or reloading.');
      }
    }
    window.addEventListener('storage', changed); return () => window.removeEventListener('storage', changed);
  }, [options.persistent, storedText]);
  function unchangedStorage() {
    if (localStorage.getItem(BRIEF_STORAGE_KEY) === storedText) return true;
    setStorageConflict(true); setMessage('The saved browser copy changed in another tab. Save or discard was stopped; neither copy was replaced. Export your working brief, then review the saved copy or reload.');
    return false;
  }
  function snapshot() {
    const selected = selection?.kind === 'exception' ? state.events.find(e => e.id === selection.id) : selection?.kind === 'order' ? state.events.find(e => e.type === 'order-committed' && e.data.orderId === selection.id) : null;
    return captureBriefSnapshot(state, runId, observation.id, selected?.id ?? null);
  }
  function edit(field: keyof typeof defaultBriefNotes, value: string) {
    const limit = field === 'owner' ? 200 : 2000;
    if (value.length > limit) return;
    setDraft(current => { const next = current ?? createDecisionBrief(snapshot()); return { ...next, updatedAt: new Date().toISOString(), notes: { ...next.notes, [field]: value } }; });
    setMessage('');
  }
  function choose(position: string) {
    if (!discussionPositions.some(value => value === position)) return;
    setDraft(current => ({ ...(current ?? createDecisionBrief(snapshot())), position, snapshot: snapshot(), updatedAt: new Date().toISOString() }));
    setImported(false); setMessage('');
  }
  function attach() {
    setDraft(current => ({ ...(current ?? createDecisionBrief(snapshot())), snapshot: snapshot(), updatedAt: new Date().toISOString() }));
    setImported(false); setMessage('Current observations attached. Review your notes against this snapshot; no recommendation was validated.');
  }
  function save() {
    const next = draft ?? createDecisionBrief(snapshot());
    setDraft(next);
    try {
      const text = exportDecisionBrief(next);
      if (!options.persistent) { setMessage('This embedded brief is memory-only. Export it to retain a copy.'); return; }
      if (!unchangedStorage()) return;
      localStorage.setItem(BRIEF_STORAGE_KEY, text); setStoredText(text); setStorageConflict(false); setSavedText(text); setMessage('Draft saved in this browser. No person is assigned or approval issued.');
    } catch { setMessage('Draft not saved: local storage is unavailable or full. Your current text is retained; export a copy.'); }
  }
  function prepareExport() {
    const next = draft ?? createDecisionBrief(snapshot());
    setDraft(next);
    try { return exportDecisionBrief(next); }
    catch (error) { setMessage(`Export unavailable: ${error instanceof Error ? error.message : 'Invalid brief'}`); return ''; }
  }
  function previewImport(text: string) {
    setPendingImport(null); setPendingSavedText(null);
    const result = importDecisionBrief(text);
    if (!result.ok) { setMessage(`${result.message} Current draft and saved copy retained.`); return; }
    setPendingImport(result.brief); setMessage('Import checked for supported structure only. Review the preview before replacing your working draft.');
  }
  function previewSaved() {
    try {
      const text = localStorage.getItem(BRIEF_STORAGE_KEY);
      if (text === null) { setMessage('The saved copy was removed in another tab. Export your working brief before reloading; no current text was changed.'); return; }
      const result = importDecisionBrief(text);
      if (!result.ok) { setMessage(`Changed saved copy cannot be imported: ${result.message} Export your working brief before reloading. Neither copy was changed.`); return; }
      setPendingImport(result.brief); setPendingSavedText(text); setMessage('Review the changed saved copy. Confirming replaces only the working draft with this copy.');
    } catch { setMessage('Cannot read the saved copy. Your working draft is retained; export it before closing.'); }
  }
  function confirmImport() {
    if (!pendingImport) return;
    if (pendingSavedText !== null) {
      try {
        if (localStorage.getItem(BRIEF_STORAGE_KEY) !== pendingSavedText) { setStorageConflict(true); setMessage('The saved copy changed again. Preview it again before replacing your working draft.'); return; }
        setStoredText(pendingSavedText); setSavedText(exportDecisionBrief(pendingImport)); setStorageConflict(false);
      } catch { setMessage('Cannot verify the saved copy. Your working draft is retained.'); return; }
    }
    setDraft(pendingImport); setPendingImport(null); setImported(true); setDiscardPending(false);
    setPendingSavedText(null);
    setMessage('Imported as an unverified discussion draft. The active run and saved local copy are unchanged; save explicitly to replace the saved copy.');
  }
  function discard() {
    try {
      if (options.persistent) { if (!unchangedStorage()) return false; localStorage.removeItem(BRIEF_STORAGE_KEY); }
      setDraft(null); setSavedText(''); setStoredText(null); setStorageConflict(false); setImported(false); setPendingImport(null); setPendingSavedText(null); setDiscardPending(false); setMessage('Working draft and its saved local copy discarded. The workflow and frozen evidence are unchanged.');
      return true;
    } catch { setMessage('Could not remove the saved local copy. Your draft is retained; local storage is unavailable.'); return false; }
  }
  const stale = !!draft && (imported || draft.snapshot.runId !== runId || draft.snapshot.observationId !== observation.id);
  return {
    draft, notes: draft?.notes ?? defaultBriefNotes, edit, choose, attach, stale, imported,
    observed: state.events.some(e => ['purchase-decided', 'order-committed', 'response-timeout', 'reconciliation-observed'].includes(e.type)),
    persistent: !!options.persistent, saved: !!draft && !storageConflict && exportDecisionBrief(draft) === savedText, message, storageConflict, previewSaved,
    save, prepareExport, previewImport, pendingImport, confirmImport, cancelImport: () => { setPendingImport(null); setPendingSavedText(null); },
    discardPending, requestDiscard: () => setDiscardPending(true), cancelDiscard: () => setDiscardPending(false), discard,
  };
}
export type DecisionBriefController = ReturnType<typeof useDecisionBrief>;
