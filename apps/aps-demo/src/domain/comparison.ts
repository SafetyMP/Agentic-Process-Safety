import { buildLabel } from './audience.ts';
import { getCase, validateDraft, type ScenarioDraft } from './cases.ts';
import type { Mode, StoryId } from './scenarios.ts';
import { decisionTrace, evaluate, type Decision, type Request, type RuleResult } from './simulation.ts';

export const MODEL_VERSION = 'aps-case-comparison-v1';
export interface IllustrativeState { orders: number; spend: number }
export interface Prediction { choice: string; rationale: string }
export interface LaneResult {
  mode: Mode;
  decision: Decision;
  reason: string;
  checks: RuleResult[];
  executed: boolean;
  violations: string[];
  executedViolations: string[];
  effect: { before: IllustrativeState; after: IllustrativeState } | null;
  businessOutcome: string;
}
export interface ComparisonRun {
  id: string;
  modelVersion: string;
  build?: string;
  caseId: StoryId;
  requestIdentity: string;
  request: Request;
  baseline: IllustrativeState;
  results: Record<Mode, LaneResult>;
  prediction: Prediction;
  parent?: { runId: string; lane: 'C' };
  assumptions: string[];
}

/** Independent conditions: an omitted enforcement check cannot erase the invalid condition. */
export function constraintViolations(request: Request): string[] {
  const violations: string[] = [];
  if (request.actor !== 'purchase') violations.push('Actor lacks purchase tool permission');
  if (!Number.isFinite(request.amount) || request.amount <= 0 || request.amount > 1000) violations.push('Spend is outside the modeled ceiling');
  if (request.depth > 3) violations.push('Delegation depth exceeds three');
  if (!request.approved) violations.push('Matching finance approval is missing');
  if (request.replay) violations.push('Purchase nonce has already been consumed');
  if (request.approvalAge >= 60) violations.push('Finance approval has expired');
  if (!request.contextBound) violations.push('Context does not belong to this task');
  if (!request.objectivesResolved) violations.push('Competing objectives remain unresolved');
  if (request.amount > 500 && request.amount <= 1000) violations.push('Exact human authorization has not been supplied');
  return violations;
}

export function compareLane(mode: Mode, request: Request, baseline: IllustrativeState, projectPurchase: boolean): LaneResult {
  const outcome = evaluate(mode, request);
  const executed = outcome.decision === 'allow';
  const violations = constraintViolations(request);
  return {
    mode, ...outcome, checks: decisionTrace(mode, request), executed, violations,
    executedViolations: executed ? [...violations] : [],
    effect: projectPurchase ? {
      before: { ...baseline },
      after: { orders: baseline.orders + (executed ? 1 : 0), spend: baseline.spend + (executed ? request.amount : 0) },
    } : null,
    businessOutcome: !projectPurchase ? 'Business effects are not modeled for this case.'
      : !executed ? 'Purchase outstanding; no illustrative order created.'
        : violations.length ? 'Illustrative order created while a modeled constraint was unmet.'
          : 'Illustrative order created; real procurement completion is not established.',
  };
}

function freezeRun(run: ComparisonRun): ComparisonRun {
  Object.freeze(run.request); Object.freeze(run.baseline); Object.freeze(run.prediction);
  if (run.parent) Object.freeze(run.parent);
  for (const result of Object.values(run.results)) {
    result.checks.forEach(Object.freeze); Object.freeze(result.checks);
    Object.freeze(result.violations); Object.freeze(result.executedViolations);
    if (result.effect) { Object.freeze(result.effect.before); Object.freeze(result.effect.after); Object.freeze(result.effect); }
    Object.freeze(result);
  }
  Object.freeze(run.results); Object.freeze(run.assumptions);
  return Object.freeze(run);
}

export function createComparison(id: string, draft: ScenarioDraft, prediction: Prediction = { choice: '', rationale: '' }, parent?: ComparisonRun, build: string | null = buildLabel): ComparisonRun {
  const validated = validateDraft(draft);
  if (!validated.request) throw new Error(validated.error!);
  if (parent && !(draft.caseId === 'stale' && parent.caseId === 'stale' && parent.results.C.decision === 'deny' && parent.request.approvalAge >= 60)) {
    throw new Error('Fresh approval exploration requires a denied stale-approval comparison.');
  }
  const request = { ...validated.request };
  if (parent) { request.approvalAge = 0; request.approved = true; request.replay = false; }
  const baseline = parent?.results.C.effect?.after ?? { orders: 0, spend: 0 };
  if (baseline.orders !== 0 || baseline.spend !== 0) throw new Error('Recovery requires the C no-effect state.');
  const projectPurchase = getCase(draft.caseId).effectMode === 'purchase';
  const results = Object.fromEntries((['A', 'B', 'C'] as Mode[]).map(mode => [mode, compareLane(mode, { ...request }, { ...baseline }, projectPurchase)])) as Record<Mode, LaneResult>;
  return freezeRun({
    id, ...(build === null ? {} : { build }), modelVersion: MODEL_VERSION, caseId: draft.caseId, requestIdentity: `${id}-unused-nonce`,
    request, baseline: { ...baseline }, results, prediction: { ...prediction },
    ...(parent ? { parent: { runId: parent.id, lane: 'C' as const } } : {}),
    assumptions: parent ? [
      'Hypothetical recovery; not demonstrated by the recorded trial.',
      'Both lanes start from the named C no-effect state, not B’s executed order.',
      'A new exact finance approval, new request identity and unused nonce are assumed.',
      'Task and context are assumed still valid; no backend reapproval or authorization occurs.',
    ] : ['Declared prerequisites are assumed; no independent agents execute.', 'Order and spend changes, where shown, are illustrative projections.'],
  });
}
