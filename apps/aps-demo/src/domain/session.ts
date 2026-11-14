import { getCase, isCaseId, presetDraft, validateDraft, type ScenarioDraft } from './cases.ts';
import { createComparison, MODEL_VERSION, type ComparisonRun, type Prediction } from './comparison.ts';
import type { StoryId } from './scenarios.ts';
import { runTitle } from './presentation.ts';

export interface DiscussionDraft {
  recommendation: string; rationale: string; evidence: string; assumptions: string;
  question: string; dissent: string; ready: boolean;
}
export function emptyDiscussion(): DiscussionDraft {
  return { recommendation: '', rationale: '', evidence: '', assumptions: '', question: '', dissent: '', ready: false };
}
export interface Session {
  draft: ScenarioDraft;
  prediction: Prediction;
  runs: ComparisonRun[];
  selectedRunId?: string;
  discussions: Record<string, DiscussionDraft>;
  nextRun: number;
}
export function initialSession(): Session {
  return { draft: presetDraft(), prediction: { choice: '', rationale: '' }, runs: [], discussions: {}, nextRun: 1 };
}
export function selectedComparison(session: Session): ComparisonRun | undefined {
  return session.runs.find(run => run.id === session.selectedRunId);
}
export function draftChanged(session: Session): boolean {
  const selected = selectedComparison(session);
  const validation = validateDraft(session.draft);
  return !!selected && (!validation.request || selected.caseId !== session.draft.caseId || JSON.stringify(selected.request) !== JSON.stringify(validation.request));
}
export type SessionAction =
  | { type: 'case'; caseId: StoryId }
  | { type: 'age'; value: string }
  | { type: 'configure'; draft: ScenarioDraft }
  | { type: 'prediction'; patch: Partial<Prediction> }
  | { type: 'run' | 'reset' | 'clear' | 'fresh' }
  | { type: 'select'; id: string }
  | { type: 'discussion'; id: string; patch: Partial<DiscussionDraft> };

export function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'case': return action.caseId === session.draft.caseId ? session : { ...session, draft: presetDraft(action.caseId), prediction: { choice: '', rationale: '' } };
    case 'age': return { ...session, draft: { ...session.draft, approvalAge: action.value } };
    case 'configure': return { ...session, draft: { ...action.draft } };
    case 'prediction': return { ...session, prediction: { ...session.prediction, ...action.patch } };
    case 'run': {
      if (!validateDraft(session.draft).request) return session;
      const run = createComparison(`comparison-${session.nextRun}`, session.draft, session.prediction);
      return { ...session, runs: [...session.runs, run], selectedRunId: run.id, nextRun: session.nextRun + 1 };
    }
    case 'select': {
      const run = session.runs.find(item => item.id === action.id);
      return run ? { ...session, selectedRunId: run.id, draft: { caseId: run.caseId, approvalAge: String(run.request.approvalAge) }, prediction: { ...run.prediction } } : session;
    }
    case 'reset': return { ...session, draft: presetDraft(session.draft.caseId), prediction: { choice: '', rationale: '' } };
    case 'clear': return initialSession();
    case 'fresh': {
      const parent = selectedComparison(session);
      if (!parent || parent.caseId !== 'stale' || parent.results.C.decision !== 'deny' || parent.request.approvalAge < 60) return session;
      const draft = { caseId: 'stale' as const, approvalAge: '0' };
      const prediction = { choice: '', rationale: '' };
      const run = createComparison(`comparison-${session.nextRun}`, draft, prediction, parent);
      return { ...session, draft, prediction, runs: [...session.runs, run], selectedRunId: run.id, nextRun: session.nextRun + 1 };
    }
    case 'discussion': {
      if (!session.runs.some(run => run.id === action.id)) return session;
      const discussion = { ...(session.discussions[action.id] ?? emptyDiscussion()), ...action.patch };
      if (!discussion.rationale.trim()) discussion.ready = false;
      return { ...session, discussions: { ...session.discussions, [action.id]: discussion } };
    }
  }
}

export function configurationFromParams(params: URLSearchParams, current: ScenarioDraft): { draft?: ScenarioDraft; error: string | null } {
  const caseValue = params.get('story') ?? params.get('case');
  if (caseValue === null && !params.has('age') && !params.has('model')) return { error: null };
  if (params.has('model') && params.get('model') !== MODEL_VERSION) return { error: 'This configuration uses an unsupported browser model version.' };
  if (caseValue !== null && !isCaseId(caseValue)) return { error: 'This link names an unknown case. Choose a case from the library.' };
  const caseId = caseValue === null ? current.caseId : caseValue as StoryId;
  const draft = caseId === current.caseId ? { ...current } : presetDraft(caseId);
  if (params.has('age')) draft.approvalAge = params.get('age')!;
  const validation = validateDraft(draft);
  return validation.request ? { draft, error: null } : { error: validation.error };
}

export function configurationLink(draft: ScenarioDraft): string {
  if (!validateDraft(draft).request) return '';
  return `#/simulator?${new URLSearchParams({ story: draft.caseId, age: draft.approvalAge, model: MODEL_VERSION }).toString()}`;
}

export function serializeSession(session: Session): string {
  return JSON.stringify({ schemaVersion: 1, modelVersion: MODEL_VERSION, category: 'Illustrative browser comparison and discussion; no authorization', session }, null, 2);
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown): string { if (typeof value !== 'string') throw new Error('Saved session has invalid text fields.'); return value; }
function predictionFrom(value: unknown): Prediction {
  if (!record(value)) throw new Error('Saved prediction is invalid.');
  return { choice: text(value.choice), rationale: text(value.rationale) };
}
function draftFrom(value: unknown): ScenarioDraft {
  if (!record(value) || !isCaseId(value.caseId)) throw new Error('Saved case is invalid.');
  // Invalid in-progress text is a legitimate draft, but cannot produce a comparison.
  return { caseId: value.caseId, approvalAge: text(value.approvalAge) };
}
/** Local snapshots are untrusted input. Rebuild model results and validate every reference. */
export function parseSession(serialized: string): Session {
  if (serialized.length > 5_000_000) throw new Error('Saved session is too large to restore. Export or clear it first.');
  const envelope: unknown = JSON.parse(serialized);
  if (!record(envelope) || envelope.schemaVersion !== 1 || envelope.modelVersion !== MODEL_VERSION || !record(envelope.session)) throw new Error('Saved session uses an unsupported format or model version.');
  const raw = envelope.session;
  if (!Array.isArray(raw.runs) || !record(raw.discussions)) throw new Error('Saved session is incomplete.');
  const runs: ComparisonRun[] = [];
  for (const item of raw.runs) {
    if (!record(item) || !isCaseId(item.caseId) || !record(item.request) || item.modelVersion !== MODEL_VERSION) throw new Error('Saved comparison is invalid.');
    const id = text(item.id);
    if (!/^comparison-[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id.slice('comparison-'.length))) || runs.some(run => run.id === id)) throw new Error('Saved comparison identity is invalid.');
    const draft = { caseId: item.caseId, approvalAge: String(item.request.approvalAge) };
    const validated = validateDraft(draft);
    if (!validated.request || JSON.stringify(validated.request) !== JSON.stringify(item.request)) throw new Error('Saved request differs from supported case inputs.');
    let parent: ComparisonRun | undefined;
    if (item.parent !== undefined) {
      if (!record(item.parent) || item.parent.lane !== 'C') throw new Error('Saved parent lane is invalid.');
      parent = runs.find(run => run.id === (item.parent as Record<string, unknown>).runId);
      if (!parent || draft.approvalAge !== '0' || draft.caseId !== 'stale') throw new Error('Saved recovery lineage is invalid.');
    }
    const rebuilt = createComparison(id, draft, predictionFrom(item.prediction), parent);
    // Tampering with derived effects or assumptions must not silently change a discussion's meaning.
    if (JSON.stringify(rebuilt) !== JSON.stringify(item)) throw new Error('Saved comparison no longer matches this browser model.');
    runs.push(rebuilt);
  }
  const discussions: Record<string, DiscussionDraft> = {};
  for (const [id, value] of Object.entries(raw.discussions)) {
    if (!runs.some(run => run.id === id) || !record(value) || typeof value.ready !== 'boolean') throw new Error('Saved discussion reference is invalid.');
    const discussion: DiscussionDraft = {
      recommendation: text(value.recommendation), rationale: text(value.rationale), evidence: text(value.evidence),
      assumptions: text(value.assumptions), question: text(value.question), dissent: text(value.dissent), ready: value.ready,
    };
    if (discussion.ready && !discussion.rationale.trim()) throw new Error('Saved discussion has no rationale.');
    discussions[id] = discussion;
  }
  const selectedRunId = raw.selectedRunId === undefined ? undefined : text(raw.selectedRunId);
  if (selectedRunId && !runs.some(run => run.id === selectedRunId)) throw new Error('Saved selected comparison is missing.');
  const nextRun = Math.max(0, ...runs.map(run => Number(run.id.slice('comparison-'.length)))) + 1;
  return { draft: draftFrom(raw.draft), prediction: predictionFrom(raw.prediction), runs, selectedRunId, discussions, nextRun };
}

export function discussionMarkdown(session: Session): string {
  const lines = ['# APS discussion brief', '', 'Illustrative browser comparisons and local reasoning. No operational authorization or hazard approval.', '', `Model: ${MODEL_VERSION}`, ''];
  for (const run of session.runs) {
    const definition = getCase(run.caseId);
    lines.push(`## ${run.id}: ${runTitle(run)}`, '', `Request identity: ${run.requestIdentity}`, `Actor: ${run.request.actor}; amount: ${run.request.amount} sandbox units; approval age: ${run.request.approvalAge} logical seconds.`, `Prediction: ${run.prediction.choice || 'Not supplied'}`, `Prediction rationale: ${run.prediction.rationale || 'Not supplied'}`, '');
    if (run.parent) lines.push(`Parent: ${run.parent.runId}, lane ${run.parent.lane}.`, '');
    for (const mode of ['B', 'C', 'A'] as const) {
      const lane = run.results[mode];
      lines.push(`- ${mode}: ${lane.decision.toUpperCase()}; ${lane.reason} ${lane.businessOutcome}`);
      if (lane.effect) lines.push(`  Illustrative orders ${lane.effect.before.orders} → ${lane.effect.after.orders}; spend ${lane.effect.before.spend} → ${lane.effect.after.spend}.`);
    }
    lines.push('', `Evidence relationship: ${definition.evidenceNote}`, `Remaining limit: ${definition.limitation}`, ...run.assumptions.map(assumption => `Assumption: ${assumption}`), '');
    const discussion = session.discussions[run.id];
    if (discussion) {
      lines.push(`Discussion status: ${discussion.ready ? 'Ready for discussion' : 'Draft'}`, '');
      for (const key of ['recommendation', 'rationale', 'evidence', 'assumptions', 'question', 'dissent'] as const) lines.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${discussion[key] || 'Not supplied'}`, '');
    }
  }
  if (!session.runs.length) lines.push('No comparison has been evaluated.');
  return lines.join('\n');
}
