import { selectWorkflow, SCENARIOS } from './workflow/index.ts';
import type { RunSpec, WorkflowState } from './workflow/index.ts';
import { exact, validateSpec } from './workflow/validation.ts';

export const BRIEF_STORAGE_KEY = 'aps-decision-brief-v1';
export const MAX_BRIEF_BYTES = 131072;
export const BRIEF_SOURCE_BASELINE = '4614d5abeb8bb1094f7110f857d2343575480000';
export const discussionPositions = ['Fresh permission at commitment', 'One commitment per purchase intent', 'Check for an existing order before retrying', 'More evidence before a recommendation'] as const;
export const defaultBriefNotes = {
  owner: '',
  decision: 'Define a bounded evaluation before delegating real purchasing authority.',
  evidence: 'Validate authorization, duplicate prevention, exception response and recovery with the intended integrations.',
};
export interface BriefSnapshot {
  runId: string; observationId: string; capturedAt: string;
  sourceBaseline: string; modelVersion: 'procurement-local/1'; spec: RunSpec;
  taskId: string; scenario: string; mode: string; status: string; transitionCount: number;
  selectedEventId: string | null; eventIds: string[]; orderIds: string[];
  orders: number; spend: number; confirmed: boolean; unsafe: number; safeCompleted: boolean; observed: boolean;
}
export interface DecisionBrief {
  schemaVersion: 'aps-decision-brief/1'; simulationOnly: true; status: 'discussion-draft';
  id: string; updatedAt: string; notes: typeof defaultBriefNotes; position: string;
  snapshot: BriefSnapshot;
}
export type BriefImport = { ok: true; brief: DecisionBrief } | { ok: false; message: string };
let identitySequence = 0;
/** Correlation identity only: not an authenticated receipt or security token. */
export function newBriefIdentity(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${++identitySequence}-${Math.random().toString(36).slice(2)}`;
}
export function captureBriefSnapshot(state: WorkflowState, runId: string, observationId: string, selectedEventId: string | null): BriefSnapshot {
  const view = selectWorkflow(state);
  const eventIds = state.events.filter(e => ['purchase-decided', 'order-committed', 'response-timeout', 'reconciliation-observed'].includes(e.type)).map(e => e.id);
  return {
    runId, observationId, capturedAt: new Date().toISOString(), sourceBaseline: BRIEF_SOURCE_BASELINE,
    modelVersion: state.spec.modelVersion, spec: JSON.parse(JSON.stringify(state.spec)) as RunSpec,
    taskId: state.spec.task.id, scenario: view.scenarioTitle, mode: state.spec.mode,
    status: state.status, transitionCount: state.transitionCount,
    selectedEventId: selectedEventId && state.events.some(e => e.id === selectedEventId) ? selectedEventId : null,
    eventIds, orderIds: state.world.orders.map(o => o.id), orders: view.metrics.committedOrders,
    spend: view.metrics.spent, confirmed: view.metrics.completed, unsafe: view.metrics.unsafeCommittedEffects,
    safeCompleted: view.metrics.safeCompleted, observed: eventIds.length > 0,
  };
}
export function createDecisionBrief(snapshot: BriefSnapshot): DecisionBrief {
  return { schemaVersion: 'aps-decision-brief/1', simulationOnly: true, status: 'discussion-draft', id: newBriefIdentity(), updatedAt: new Date().toISOString(), notes: { ...defaultBriefNotes }, position: '', snapshot };
}
const boundedText = (value: unknown, max: number) => typeof value === 'string' && value.length <= max;
const identity = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9._:-]{1,128}$/.test(value);
const count = (value: unknown, max: number) => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max;
const date = (value: unknown) => typeof value === 'string' && value.length === 24 && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const ids = (value: unknown) => Array.isArray(value) && value.length <= 1000 && value.every(identity) && new Set(value).size === value.length;
function validSnapshot(value: unknown): value is BriefSnapshot {
  if (!exact(value, ['runId', 'observationId', 'capturedAt', 'sourceBaseline', 'modelVersion', 'spec', 'taskId', 'scenario', 'mode', 'status', 'transitionCount', 'selectedEventId', 'eventIds', 'orderIds', 'orders', 'spend', 'confirmed', 'unsafe', 'safeCompleted', 'observed'])) return false;
  if (!identity(value.runId) || !identity(value.observationId) || !date(value.capturedAt) || typeof value.sourceBaseline !== 'string' || !/^[0-9a-f]{40}$/.test(value.sourceBaseline) || value.modelVersion !== 'procurement-local/1' || validateSpec(value.spec) !== null) return false;
  const spec = value.spec as RunSpec;
  return value.taskId === spec.task.id && value.mode === spec.mode && value.scenario === SCENARIOS.find(s => s.id === spec.scenario)?.title
    && ['ready', 'active', 'blocked-recoverable', 'outcome-unknown', 'completed', 'failed', 'budget-exhausted'].includes(value.status as string)
    && count(value.transitionCount, spec.limits.maxTransitions) && (value.selectedEventId === null || identity(value.selectedEventId))
    && ids(value.eventIds) && ids(value.orderIds) && count(value.orders, 1000) && value.orders === (value.orderIds as string[]).length
    && count(value.spend, Number.MAX_SAFE_INTEGER) && count(value.unsafe, 1000)
    && ['confirmed', 'safeCompleted', 'observed'].every(key => typeof value[key] === 'boolean')
    && value.observed === ((value.eventIds as string[]).length > 0);
}
/** Inspect original tokens: JSON.parse can discard deeply nested duplicate values. */
function sourceDepthWithinLimit(text: string): boolean {
  let depth = 0, inString = false, escaped = false;
  for (const char of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '{' || char === '[') { if (++depth > 16) return false; }
    else if (char === '}' || char === ']') { if (--depth < 0) return false; }
  }
  return depth === 0 && !inString;
}
/** Original source depth is bounded before this recursive token scan. */
function hasDuplicateKeys(text: string): boolean {
  let at = 0, duplicate = false;
  const whitespace = () => { while (at < text.length && /\s/.test(text[at])) at++; };
  const string = (): string => {
    const start = at++;
    while (at < text.length) { const char = text[at++]; if (char === '\\') at++; else if (char === '"') break; }
    return JSON.parse(text.slice(start, at)) as string;
  };
  const value = () => {
    whitespace();
    if (text[at] === '{') {
      at++; whitespace(); const keys = new Set<string>(); if (text[at] === '}') { at++; return; }
      while (at < text.length) { whitespace(); const key = string(); if (keys.has(key)) duplicate = true; keys.add(key); whitespace(); at++; value(); whitespace(); if (text[at++] === '}') break; }
    } else if (text[at] === '[') {
      at++; whitespace(); if (text[at] === ']') { at++; return; }
      while (at < text.length) { value(); whitespace(); if (text[at++] === ']') break; }
    } else if (text[at] === '"') string();
    else while (at < text.length && !/[\s,}\]]/.test(text[at])) at++;
  };
  value(); return duplicate;
}
export function importDecisionBrief(text: string): BriefImport {
  const fail = (message: string): BriefImport => ({ ok: false, message });
  if (new TextEncoder().encode(text).length > MAX_BRIEF_BYTES) return fail('Brief exceeds the 128 KiB limit.');
  if (!sourceDepthWithinLimit(text)) return fail('Brief JSON has invalid or excessive nesting.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { return fail('Brief is not valid JSON.'); }
  if (!exact(value, ['schemaVersion', 'simulationOnly', 'status', 'id', 'updatedAt', 'notes', 'position', 'snapshot'])) return fail('Brief fields do not match the supported format.');
  if (value.schemaVersion !== 'aps-decision-brief/1' || value.simulationOnly !== true || value.status !== 'discussion-draft') return fail('Only version 1 simulation discussion drafts are supported.');
  if (!identity(value.id) || !date(value.updatedAt) || !exact(value.notes, ['owner', 'decision', 'evidence'])
    || !boundedText(value.notes.owner, 200) || !boundedText(value.notes.decision, 2000) || !boundedText(value.notes.evidence, 2000)
    || (value.position !== '' && !discussionPositions.some(position => position === value.position)) || !validSnapshot(value.snapshot)) return fail('Brief notes or observation fields are invalid.');
  if (hasDuplicateKeys(text)) return fail('Duplicate JSON keys are ambiguous.');
  return { ok: true, brief: value as unknown as DecisionBrief };
}
export function exportDecisionBrief(brief: DecisionBrief): string {
  const text = JSON.stringify(brief, null, 2);
  const checked = importDecisionBrief(text);
  if (!checked.ok) throw new Error(checked.message);
  return text;
}
