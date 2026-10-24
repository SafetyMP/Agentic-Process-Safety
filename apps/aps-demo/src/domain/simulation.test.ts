import { describe, expect, it } from 'vitest';
import requirements from '../fixtures/requirements.json';
import hazards from '../fixtures/hazards.json';
import { stories, type Mode } from './scenarios';
import { boundedSeed, decisionTrace, evaluate, initialState, metrics, reducer, requestFor, type State } from './simulation';

function run(state: State): State {
  for (let index = 0; index < 3; index++) state = reducer(state, { type: 'step' });
  return state;
}
describe('ordered browser policy trace', () => {
  for (const mode of ['A', 'B', 'C'] as Mode[]) for (const story of stories) {
    it(`${mode}/${story.id} records terminal checks truthfully`, () => {
      const request = requestFor(story.id, 1);
      const trace = decisionTrace(mode, request);
      const result = evaluate(mode, request);
      expect(trace.filter(r => r.status === 'fail')).toHaveLength(result.decision === 'allow' ? 0 : 1);
      const terminal = trace.findIndex(r => r.status === 'fail');
      if (terminal >= 0) {
        expect(trace[terminal].terminal).toBe(result.decision);
        expect(trace[terminal].reason).toBe(result.reason);
        expect(trace.slice(terminal + 1).every(r => r.status === 'skipped')).toBe(true);
      }
      expect(trace).toHaveLength(mode === 'A' ? 1 : mode === 'B' ? 2 : 9);
    });
  }
});
describe('nine required stories across all three illustrative modes', () => {
  for (const mode of ['A', 'B', 'C'] as Mode[]) {
    for (const story of stories) {
      it(`${mode}: ${story.title}`, () => {
        const state = run(initialState(42, mode, story.id));
        const expected = mode === 'A' || story.id === 'normal' ? 'allow'
          : mode === 'B' ? (['unauthorized', 'spending'].includes(story.id) ? 'deny' : 'allow')
          : story.id === 'conflict' ? 'review' : 'deny';
        expect(state.events).toHaveLength(1);
        expect(state.events[0].decision).toBe(expected);
        expect(state.events[0].category).toBe('Illustrative browser simulation');
        expect(state.events[0].executed).toBe(expected === 'allow');
        expect(state.pending !== null).toBe(expected === 'review');
        expect(state.running).toBe(false);
      });
    }
  }
});
describe('logical scheduler and isolation', () => {
  it('reproduces the same seed and action sequence without mutating inputs', () => {
    const original = initialState(19, 'C', 'spending');
    const snapshot = structuredClone(original);
    expect(run(original)).toEqual(run(initialState('19', 'C', 'spending')));
    expect(original).toEqual(snapshot);
    expect(requestFor('normal', 19).amount).not.toBe(requestFor('normal', 20).amount);
  });
  it('timer advances only when started; pause stops queued timer actions', () => {
    let state = initialState();
    expect(reducer(state, { type: 'timer' })).toEqual(state);
    state = reducer(state, { type: 'start' });
    state = reducer(state, { type: 'timer' });
    expect(state.tick).toBe(1);
    state = reducer(state, { type: 'pause' });
    expect(reducer(state, { type: 'timer' })).toEqual(state);
    expect(reducer(state, { type: 'step' }).tick).toBe(2);
  });
  it('reset clears faults, pending review and event history', () => {
    let state = reducer(initialState(77), { type: 'inject', story: 'conflict' });
    state = run(state);
    expect(state.pending).not.toBeNull();
    expect(reducer(state, { type: 'reset' })).toEqual(initialState(77));
  });
  it('mode, seed and scenario switches isolate all prior outcomes', () => {
    const state = run(initialState(12, 'A', 'spending'));
    expect(reducer(state, { type: 'configure', mode: 'C', story: 'normal', seed: 23 }))
      .toEqual(initialState(23, 'C', 'normal'));
  });
  it.each([NaN, Infinity, -Infinity, {}, undefined, 'invalid'])('bounds invalid seed %s', value => {
    expect(boundedSeed(value)).toBe(1);
  });
  it('clamps large, negative and fractional seeds', () => {
    expect(boundedSeed(1e30)).toBe(2147483647);
    expect(boundedSeed(-100)).toBe(0);
    expect(boundedSeed(3.9)).toBe(3);
  });
  it('predefined injection changes the next operation and cannot alter completed runs', () => {
    const state = run(reducer(initialState(), { type: 'inject', story: 'context' }));
    expect(state.events[0].control).toBe('CTL-CONTEXT');
    expect(state.events[0].decision).toBe('deny');
    expect(reducer(state, { type: 'inject', story: 'normal' })).toEqual(state);
    expect(reducer(state, { type: 'step' })).toEqual({ ...state, running: false });
  });
});
describe('review branches, boundaries and traceability', () => {
  it.each([true, false])('records an explicit reviewer decision %s exactly once', approved => {
    const pending = run(initialState(1, 'C', 'conflict'));
    expect(reducer(pending, { type: 'start' }).running).toBe(false);
    const resolved = reducer(pending, { type: 'resolve', approved });
    expect(resolved.events[1].decision).toBe(approved ? 'allow' : 'deny');
    expect(resolved.events[1].reason).toContain('Illustrative reviewer');
    expect(resolved.completed).toBe(true);
    expect(reducer(resolved, { type: 'resolve', approved })).toEqual(resolved);
  });
  it('uses inclusive spend/depth limits, exclusive expiry and independent human threshold', () => {
    const request = { ...requestFor('normal', 1), amount: 500, depth: 3, approvalAge: 59 };
    expect(evaluate('C', request).decision).toBe('allow');
    expect(evaluate('C', { ...request, depth: 4 }).decision).toBe('deny');
    expect(evaluate('C', { ...request, approvalAge: 60 }).decision).toBe('deny');
    expect(evaluate('C', { ...request, approvalAge: 61 }).decision).toBe('deny');
    expect(evaluate('C', { ...request, amount: 501 }).decision).toBe('review');
    expect(decisionTrace('C', { ...request, amount: 501 }).find(r => r.terminal)?.terminal).toBe('review');
    expect(evaluate('C', { ...request, amount: 1000 }).decision).toBe('review');
    expect(evaluate('C', { ...request, amount: 1001 }).decision).toBe('deny');
    for (const amount of [NaN, Infinity, -1, 0]) expect(evaluate('C', { ...request, amount }).decision).toBe('deny');
  });
  it('derives live outcomes only from events without importing recorded rates', () => {
    expect(metrics(initialState()).unsafeAttempts).toBe(0);
    expect(metrics(run(initialState(1, 'C', 'spending')))).toMatchObject({ unsafeAttempts: 1, unsafeExecuted: 0, blocked: 1, taskCompleted: false });
    expect(metrics(run(initialState(1, 'A', 'spending')))).toMatchObject({ unsafeAttempts: 1, unsafeExecuted: 1, blocked: 0, taskCompleted: true });
  });
  it('resolves every story to actual proposed requirement and hazard; preserves objective gap', () => {
    for (const story of stories) {
      const requirement = requirements.find(item => item.controls.some(control => control.id === story.control));
      expect(requirement, story.id).toBeDefined();
      expect(requirement!.state).toBe('proposed');
      expect(JSON.stringify(hazards)).toContain(requirement!.hazard_id);
    }
    const conflict = requirements.flatMap(item => item.controls).find(item => item.id === 'GAP-CONFLICTING_OBJECTIVES');
    expect(conflict?.status).toBe('gap');
    expect(conflict?.test).toBe('none');
  });
});
