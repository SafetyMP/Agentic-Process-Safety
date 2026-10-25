import { createWorkflow, workflowReducer } from './engine.ts';
import { canonical, digest } from './scenarios.ts';
import { canAdvance } from './scheduler.ts';
import { MAX_EXPORT_BYTES, MAX_JOURNAL } from './types.ts';
import type { ImportResult, JournalEntry, WorkflowState } from './types.ts';
import { exact, plain, safeTree, validateSpec } from './validation.ts';

/** Playback state is excluded: the same logical action sequence has the same evidence. */
export function semanticState(state: WorkflowState): unknown {
  const { running: _running, currentTransitionId: _transition, ...semantic } = state;
  void _running; void _transition;
  return { ...semantic, status: semantic.status === 'ready' ? 'active' : semantic.status };
}
/** JSON.parse accepts duplicate keys. Reject that ambiguity using the original tokens. */
function duplicateKeys(text: string): boolean {
  let at = 0, duplicate = false;
  const whitespace = () => { while (/\s/.test(text[at] ?? '') && at < text.length) at++; };
  const string = (): string => {
    const start = at++;
    while (at < text.length) { const char = text[at++]; if (char === '\\') at++; else if (char === '"') break; }
    return JSON.parse(text.slice(start, at)) as string;
  };
  const value = () => {
    whitespace();
    if (text[at] === '{') {
      at++; whitespace(); const keys = new Set<string>();
      if (text[at] === '}') { at++; return; }
      while (at < text.length) {
        whitespace(); const key = string(); if (keys.has(key)) duplicate = true; keys.add(key);
        whitespace(); at++; value(); whitespace(); if (text[at++] === '}') break;
      }
    } else if (text[at] === '[') {
      at++; whitespace(); if (text[at] === ']') { at++; return; }
      while (at < text.length) { value(); whitespace(); if (text[at++] === ']') break; }
    } else if (text[at] === '"') string();
    else while (at < text.length && !/[\s,}\]]/.test(text[at])) at++;
  };
  value(); return duplicate;
}
export function exportWorkflow(state: WorkflowState): string {
  const text = canonical({ schemaVersion: 'aps-browser-replay/1', simulationOnly: true, checksumAlgorithm: 'fnv1a64-consistency-only', spec: state.spec,
    journal: state.journal, transitionCount: state.transitionCount, events: state.events, expectedStateDigest: digest(semanticState(state)), expectedEventDigest: digest(state.events) });
  if (new TextEncoder().encode(text).length > MAX_EXPORT_BYTES) throw new Error('Export exceeds 256 KiB bound');
  return text;
}
export function importWorkflow(text: string): ImportResult {
  const fail = (code: Exclude<ImportResult, { ok: true }>['code'], message: string): ImportResult => ({ ok: false, code, message });
  if (new TextEncoder().encode(text).length > MAX_EXPORT_BYTES) return fail('resource-limit', 'Replay exceeds 256 KiB');
  let doc: unknown;
  try { doc = JSON.parse(text); } catch { return fail('invalid-json', 'Replay is not valid JSON'); }
  if (!safeTree(doc) || !exact(doc, ['schemaVersion', 'simulationOnly', 'checksumAlgorithm', 'spec', 'journal', 'transitionCount', 'events', 'expectedStateDigest', 'expectedEventDigest'])) return fail('invalid-structure', 'Replay fields or values are invalid');
  if (duplicateKeys(text)) return fail('invalid-structure', 'Duplicate JSON object keys are ambiguous');
  if (doc.schemaVersion !== 'aps-browser-replay/1' || doc.simulationOnly !== true || doc.checksumAlgorithm !== 'fnv1a64-consistency-only') return fail('unsupported-version', 'Unsupported replay version or simulation marker');
  const specError = validateSpec(doc.spec);
  if (specError) return fail(specError === 'unsupported-version' ? 'unsupported-version' : specError === 'digest-mismatch' ? 'digest-mismatch' : 'invalid-structure', 'Invalid replay specification: ' + specError);
  if (!Array.isArray(doc.journal) || doc.journal.length > MAX_JOURNAL || !Array.isArray(doc.events) || doc.events.length > 1000 || !Number.isSafeInteger(doc.transitionCount) || (doc.transitionCount as number) < 0 || (doc.transitionCount as number) > 100) return fail('resource-limit', 'Replay execution limits invalid');
  let previous = 0;
  for (const entry of doc.journal) {
    if (!exact(entry, ['atTransition', 'command']) || !Number.isSafeInteger(entry.atTransition) || (entry.atTransition as number) < previous || (entry.atTransition as number) > (doc.transitionCount as number) || !plain(entry.command)) return fail('invalid-structure', 'Invalid journal boundary');
    const command = entry.command;
    if (command.type === 'recover' ? !exact(command, ['type', 'blockedEventId']) || typeof command.blockedEventId !== 'string'
      : command.type === 'reconcile' ? !exact(command, ['type', 'unknownEventId']) || typeof command.unknownEventId !== 'string'
        : command.type === 'inject' ? !exact(command, ['type', 'fault']) || !plain(command.fault)
          : true) return fail('invalid-structure', 'Unknown journal command');
    previous = entry.atTransition as number;
  }
  const seen = new Set<string>();
  for (const event of doc.events) {
    if (!plain(event) || typeof event.id !== 'string' || seen.has(event.id) || !Array.isArray(event.parentEventIds) || event.parentEventIds.some(id => !seen.has(id))) return fail('invalid-structure', 'Duplicate event ID or dangling/forward causal parent');
    seen.add(event.id);
  }
  try {
    let state = createWorkflow(doc.spec as WorkflowState['spec']);
    const entries = doc.journal as JournalEntry[];
    let index = 0;
    while (true) {
      while (index < entries.length && entries[index].atTransition === state.transitionCount) { state = workflowReducer(state, entries[index].command); index++; }
      if (state.transitionCount === doc.transitionCount) break;
      if (!canAdvance(state)) return fail('replay-mismatch', 'Journal cannot reach requested transition');
      state = workflowReducer(state, { type: 'step' });
    }
    const lastWitness = doc.events[doc.events.length - 1];
    if (entries.length === MAX_JOURNAL && plain(lastWitness) && lastWitness.type === 'run-terminal' && lastWitness.reasonCode === 'journal-bound') {
      state = workflowReducer(state, entries[entries.length - 1].command);
    }
    if (digest(semanticState(state)) !== doc.expectedStateDigest && canAdvance(state)) {
      const exhausted = workflowReducer(state, { type: 'step' });
      if (exhausted.transitionCount === state.transitionCount && exhausted.status === 'budget-exhausted') state = exhausted;
    }
    if (index !== entries.length || canonical(state.events) !== canonical(doc.events) || digest(state.events) !== doc.expectedEventDigest || digest(semanticState(state)) !== doc.expectedStateDigest) return fail('replay-mismatch', 'Recomputed state or causal events do not match');
    return { ok: true, state };
  } catch { return fail('invalid-structure', 'Replay violates the supported execution contract'); }
}
