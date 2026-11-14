import { describe, expect, it } from 'vitest';
import experiment from '../fixtures/experiment.json';
import hazards from '../fixtures/hazards.json';
import { caseDefinitions, getCase, presetDraft, validateDraft } from './cases.ts';
import { compareLane, constraintViolations, createComparison } from './comparison.ts';
import { configurationFromParams, configurationLink, discussionMarkdown, draftChanged, initialSession, parseSession, selectedComparison, serializeSession, sessionReducer } from './session.ts';

describe('paired case evaluation', () => {
  it.each([59, 60, 61])('compares one input at age %i with independent constraint/effect results', age => {
    const run = createComparison('comparison-1', { caseId: 'stale', approvalAge: String(age) });
    expect(run.request.amount).toBe(300);
    expect(run.results.B.decision).toBe('allow');
    expect(run.results.C.decision).toBe(age < 60 ? 'allow' : 'deny');
    expect(run.results.B.effect?.after).toEqual({ orders: 1, spend: 300 });
    expect(run.results.C.effect?.after).toEqual(age < 60 ? { orders: 1, spend: 300 } : { orders: 0, spend: 0 });
    expect(run.results.B.executedViolations).toEqual(age < 60 ? [] : ['Finance approval has expired']);
    expect(run.results.C.executedViolations).toEqual([]);
    expect(run.results.C.violations).toEqual(run.results.B.violations);
  });
  it('shows equal outcomes for normal and unauthorized cases', () => {
    for (const caseId of ['normal', 'unauthorized'] as const) {
      const run = createComparison('comparison-1', presetDraft(caseId));
      expect(run.results.B.decision).toBe(caseId === 'normal' ? 'allow' : 'deny');
      expect(run.results.C.decision).toBe(run.results.B.decision);
    }
  });
  it('supports all nine cases without inventing complex effect projections', () => {
    expect(caseDefinitions).toHaveLength(9);
    for (const definition of caseDefinitions) {
      const run = createComparison('comparison-1', presetDraft(definition.id));
      expect(run.results.C.decision).toBe(definition.id === 'normal' ? 'allow' : definition.id === 'conflict' ? 'review' : 'deny');
      if (definition.effectMode === 'unmodeled') expect(run.results.A.effect).toBeNull();
    }
  });
  it('is order independent, does not mutate baseline, and freezes stored result snapshots', () => {
    const request = { ...getCase('stale').preset };
    const baseline = { orders: 0, spend: 0 };
    const firstB = compareLane('B', request, baseline, true);
    const firstC = compareLane('C', request, baseline, true);
    expect(compareLane('C', request, baseline, true)).toEqual(firstC);
    expect(compareLane('B', request, baseline, true)).toEqual(firstB);
    expect(baseline).toEqual({ orders: 0, spend: 0 });
    expect(request).toEqual(getCase('stale').preset);
    const run = createComparison('comparison-1', presetDraft());
    expect(Object.isFrozen(run.request)).toBe(true);
    expect(Object.isFrozen(run.results.B.effect?.after)).toBe(true);
  });
  it('separates invalid conditions from denied effects and review outcomes', () => {
    const request = { ...getCase('normal').preset, amount: 501 };
    const lane = compareLane('C', request, { orders: 0, spend: 0 }, true);
    expect(lane.decision).toBe('review');
    expect(lane.effect?.after).toEqual({ orders: 0, spend: 0 });
    expect(lane.executedViolations).toEqual([]);
    expect(constraintViolations(request)).toContain('Exact human authorization has not been supplied');
    expect(compareLane('C', { ...request, approvalAge: 60 }, { orders: 0, spend: 0 }, true).decision).toBe('deny');
  });
  it.each(['', 'NaN', 'Infinity', '-1', '2.5', '121', '1e1'])('rejects invalid age %s without evaluating an alternate input', approvalAge => {
    expect(validateDraft({ caseId: 'stale', approvalAge }).request).toBeNull();
  });
});

describe('session history and human reasoning', () => {
  it('retains all 61 → 59 → 60 outcomes, prediction and rationale when switching and resetting', () => {
    let session = initialSession();
    session = sessionReducer(session, { type: 'prediction', patch: { choice: 'Only B executes', rationale: 'Finance authorization is old.' } });
    session = sessionReducer(session, { type: 'run' });
    const original = session.runs[0];
    session = sessionReducer(session, { type: 'discussion', id: original.id, patch: { recommendation: 'Request a new approval', rationale: 'Do not execute the expired request.', ready: true } });
    for (const age of ['59', '60']) {
      session = sessionReducer(session, { type: 'age', value: age });
      expect(draftChanged(session)).toBe(true);
      session = sessionReducer(session, { type: 'run' });
    }
    expect(session.runs).toHaveLength(3);
    expect(session.runs[0]).toBe(original);
    expect(session.runs.map(run => run.request.approvalAge)).toEqual([61, 59, 60]);
    session = sessionReducer(session, { type: 'select', id: original.id });
    expect(session.draft.approvalAge).toBe('61');
    expect(session.prediction.rationale).toBe('Finance authorization is old.');
    session = sessionReducer(session, { type: 'reset' });
    expect(session.runs).toHaveLength(3);
    expect(session.discussions[original.id].ready).toBe(true);
    expect(discussionMarkdown(session)).toContain('Do not execute the expired request.');
  });
  it('reruns from a zero baseline and forks only C’s denied state with a new request identity', () => {
    let session = sessionReducer(initialSession(), { type: 'run' });
    session = sessionReducer(session, { type: 'run' });
    expect(session.runs.every(run => run.results.B.effect?.after.orders === 1)).toBe(true);
    const parent = selectedComparison(session)!;
    session = sessionReducer(session, { type: 'fresh' });
    const child = selectedComparison(session)!;
    expect(child.parent).toEqual({ runId: parent.id, lane: 'C' });
    expect(child.baseline).toEqual({ orders: 0, spend: 0 });
    expect(child.requestIdentity).not.toBe(parent.requestIdentity);
    expect(child.request.approvalAge).toBe(0);
    expect(child.results.B.effect?.after).toEqual({ orders: 1, spend: 300 });
    expect(child.results.C.effect?.after).toEqual({ orders: 1, spend: 300 });
    expect(parent.results.C.decision).toBe('deny');
    expect(sessionReducer(session, { type: 'fresh' })).toBe(session);
  });
  it('notes cannot authorize, resolve objective conflict or become ready without a rationale', () => {
    let session = sessionReducer(initialSession(), { type: 'case', caseId: 'conflict' });
    session = sessionReducer(session, { type: 'run' });
    const run = selectedComparison(session)!;
    session = sessionReducer(session, { type: 'discussion', id: run.id, patch: { recommendation: 'Proceed', ready: true } });
    expect(session.discussions[run.id].ready).toBe(false);
    expect(selectedComparison(session)?.results.C.decision).toBe('review');
    expect(sessionReducer(session, { type: 'discussion', id: 'missing', patch: { rationale: 'x' } })).toBe(session);
  });
  it('does not mutate frozen research fixtures during branching and export', () => {
    const before = JSON.stringify({ experiment, hazards });
    let session = sessionReducer(initialSession(), { type: 'run' });
    session = sessionReducer(session, { type: 'fresh' });
    serializeSession(session); discussionMarkdown(session);
    expect(JSON.stringify({ experiment, hazards })).toBe(before);
  });
});

describe('local persistence and configuration links', () => {
  it('round-trips reference closure, including a recovery parent, discussions and an invalid draft', () => {
    let session = sessionReducer(initialSession(), { type: 'run' });
    session = sessionReducer(session, { type: 'discussion', id: session.runs[0].id, patch: { rationale: 'Inspect the original.', dissent: 'Need quotation evidence.' } });
    session = sessionReducer(session, { type: 'fresh' });
    session = sessionReducer(session, { type: 'age', value: '' });
    expect(parseSession(serializeSession(session))).toEqual(session);
  });
  it('rejects altered effects, broken lineage, invalid references and model versions', () => {
    const session = sessionReducer(initialSession(), { type: 'run' });
    const edited = JSON.parse(serializeSession(session));
    edited.session.runs[0].results.C.effect.after.orders = 1;
    expect(() => parseSession(JSON.stringify(edited))).toThrow(/no longer matches/);
    const missing = JSON.parse(serializeSession(session));
    missing.session.selectedRunId = 'comparison-999';
    expect(() => parseSession(JSON.stringify(missing))).toThrow(/missing/);
    const version = JSON.parse(serializeSession(session));
    version.modelVersion = 'unknown';
    expect(() => parseSession(JSON.stringify(version))).toThrow(/unsupported/);
  });
  it('shares only validated authored configuration and preserves same-case input on navigation', () => {
    const current = { caseId: 'stale' as const, approvalAge: '59' };
    const link = configurationLink(current);
    expect(link).toContain('age=59');
    expect(link).not.toContain('rationale');
    expect(configurationFromParams(new URLSearchParams('story=stale'), current).draft).toEqual(current);
    expect(configurationFromParams(new URLSearchParams('control=CTL-EXPIRY'), current).draft).toBeUndefined();
    expect(configurationFromParams(new URLSearchParams('story=context'), current).draft?.caseId).toBe('context');
    expect(configurationFromParams(new URLSearchParams('story=stale&age=-1'), current).error).toBeTruthy();
    expect(configurationFromParams(new URLSearchParams('story=unknown'), current).error).toBeTruthy();
    expect(configurationFromParams(new URLSearchParams('model=old'), current).error).toBeTruthy();
  });
});
