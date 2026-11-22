import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getCase, validateDraft } from '../domain/cases.ts';
import type { Prediction } from '../domain/comparison.ts';
import type { StoryId } from '../domain/scenarios.ts';
import { configurationFromParams, configurationLink, discussionMarkdown, draftChanged, initialSession, parseSession, selectedComparison, serializeSession, sessionReducer, type DiscussionDraft, type Session, type SessionAction } from '../domain/session.ts';

const STORAGE_KEY = 'aps-redesign-session-v1';
function useSessionState() {
  const [session, setSession] = useState<Session>(initialSession);
  const [storageMessage, setStorageMessage] = useState('');
  const [configError, setConfigError] = useState('');
  const current = useRef(session);
  current.current = session;
  const dispatch = useCallback((action: SessionAction) => setSession(previous => sessionReducer(previous, action)), []);
  useEffect(() => {
    const configure = () => {
      const query = window.location.hash.split('?')[1] ?? '';
      const parsed = configurationFromParams(new URLSearchParams(query), current.current.draft);
      setConfigError(parsed.error ?? '');
      if (parsed.draft) dispatch({ type: 'configure', draft: parsed.draft });
    };
    configure();
    window.addEventListener('hashchange', configure);
    return () => window.removeEventListener('hashchange', configure);
  }, [dispatch]);
  const storage = (operation: () => string) => {
    try { setStorageMessage(operation()); }
    catch (error) { setStorageMessage(`Browser storage unavailable: ${error instanceof Error ? error.message : 'operation failed'}. In-memory comparisons remain available for export.`); }
  };
  return {
    session,
    draft: session.draft,
    caseDefinition: getCase(session.draft.caseId),
    validation: validateDraft(session.draft),
    runs: session.runs,
    selectedRun: selectedComparison(session),
    isDirty: draftChanged(session),
    prediction: session.prediction,
    discussions: session.discussions,
    configError,
    setPrediction: (patch: Partial<Prediction>) => dispatch({ type: 'prediction', patch }),
    setCase: (caseId: StoryId) => { setConfigError(''); dispatch({ type: 'case', caseId }); },
    prepareExpiry: () => {
      setConfigError('');
      dispatch({ type: 'configure', draft: { caseId: 'stale', approvalAge: '61' } });
    },
    setApprovalAge: (value: string) => { setConfigError(''); dispatch({ type: 'age', value }); },
    runComparison: () => { if (!configError) dispatch({ type: 'run' }); },
    selectRun: (id: string) => dispatch({ type: 'select', id }),
    resetInputs: () => { setConfigError(''); dispatch({ type: 'reset' }); },
    clearSession: () => { dispatch({ type: 'clear' }); setConfigError(''); },
    forkFreshApproval: () => dispatch({ type: 'fresh' }),
    updateDiscussion: (runId: string, patch: Partial<DiscussionDraft>) => dispatch({ type: 'discussion', id: runId, patch }),
    saveLocal: () => storage(() => { localStorage.setItem(STORAGE_KEY, serializeSession(session)); return 'Session saved in this browser only. Saving is manual; later edits remain in memory until saved again.'; }),
    loadLocal: () => storage(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return 'No saved APS session in this browser.';
      const restored = parseSession(saved);
      setSession(restored); setConfigError('');
      return 'Saved browser session restored. These are illustrative comparisons, not operational evidence.';
    }),
    deleteSaved: () => storage(() => { localStorage.removeItem(STORAGE_KEY); return 'Saved browser copy deleted. The current in-memory session is unchanged.'; }),
    storageMessage,
    exportJSON: () => serializeSession(session),
    exportMarkdown: () => discussionMarkdown(session),
    configLink: configurationLink(session.draft),
  };
}
export type SessionContextValue = ReturnType<typeof useSessionState>;
const Context = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useSessionState()}>{children}</Context.Provider>;
}
export function useSession(): SessionContextValue {
  const session = useContext(Context);
  if (!session) throw new Error('APS components require SessionProvider.');
  return session;
}
