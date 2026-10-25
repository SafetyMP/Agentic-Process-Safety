import { describe, expect, it } from 'vitest';
import { createWorkflow, exportWorkflow, importWorkflow, scenarioSpec, SCENARIOS, selectWorkflow, workflowReducer } from './index.ts';
import type { Mode, WorkflowState } from './types.ts';
import { canonical, digest } from './scenarios.ts';
import { semanticState } from './replay.ts';

function finish(s: WorkflowState): WorkflowState {
  for (let i = 0; i < 100; i++) {
    if (s.status === 'blocked-recoverable') s = workflowReducer(s, { type: 'recover', blockedEventId: s.blockedEventId! });
    else if (s.status === 'outcome-unknown') s = workflowReducer(s, { type: 'reconcile', unknownEventId: s.unknownEventId! });
    else if (selectWorkflow(s).controls.canStep) s = workflowReducer(s, { type: 'step' }); else break;
  }
  return s;
}
describe('E11–12 deterministic, validated recomputation', () => {
  for (const scenario of SCENARIOS) for (const mode of ['A', 'B', 'C'] as Mode[]) it(`recomputes ${scenario.id}/${mode} from spec and journal`, () => {
    const s = finish(createWorkflow(scenarioSpec(scenario.id, mode)));
    const serialized = exportWorkflow(s), result = importWorkflow(serialized);
    expect(result.ok).toBe(true); if (result.ok) expect(canonical(semanticState(result.state))).toBe(canonical(semanticState(s)));
    expect(exportWorkflow(finish(createWorkflow(scenarioSpec(scenario.id, mode))))).toBe(serialized);
  });
  it('replays opposite schedule, dynamic injection, rejected commands and partial runs', () => {
    const cases = [finish(createWorkflow(scenarioSpec('purchase-race', 'C', 'proposal-2-first'))), createWorkflow(), workflowReducer(createWorkflow(), { type: 'start' })];
    let injected = workflowReducer(createWorkflow(), { type: 'recover', blockedEventId: 'wrong' });
    injected = workflowReducer(injected, { type: 'inject', fault: { id: 'dynamic', kind: 'delay-approval', delay: 60 } }); cases.push(finish(injected));
    for (const s of cases) expect(importWorkflow(exportWorkflow(s)).ok).toBe(true);
  });
  it.each(['extra', 'version', 'fixture', 'event', 'parents', 'duplicate-id', 'journal', 'nonfinite', 'prototype'] as const)('rejects tampered %s without trusting stored success', fault => {
    const raw = JSON.parse(exportWorkflow(finish(createWorkflow()))) as Record<string, unknown>;
    if (fault === 'extra') raw.success = true;
    if (fault === 'version') raw.schemaVersion = 'other';
    if (fault === 'fixture') (raw.spec as { fixtureDigest: string }).fixtureDigest = 'forged';
    const events = raw.events as { id: string; parentEventIds: string[]; reasonCode?: string }[];
    if (fault === 'event') events[0].reasonCode = 'fake';
    if (fault === 'parents') events[0].parentEventIds = ['future'];
    if (fault === 'duplicate-id') events[1].id = events[0].id;
    if (fault === 'journal') raw.journal = [{ atTransition: 100, command: { type: 'recover', blockedEventId: 'fake' } }];
    if (fault === 'nonfinite') (raw.spec as { seed: number }).seed = Infinity;
    if (fault === 'prototype') raw['constructor'] = {};
    expect(importWorkflow(JSON.stringify(raw)).ok).toBe(false);
  });
  it('rejects duplicate JSON keys, including escaped duplicates, and invalid/oversized text', () => {
    const text = exportWorkflow(createWorkflow());
    expect(importWorkflow(text.replace('"simulationOnly":true', '"simulationOnly":false,"simulationOnly":true')).ok).toBe(false);
    expect(importWorkflow(text.replace('"simulationOnly":true', '"simulationOnly":false,"\\u0073imulationOnly":true')).ok).toBe(false);
    expect(importWorkflow('{').ok).toBe(false); expect(importWorkflow(' '.repeat(262145)).ok).toBe(false);
  });
  it('rejects simultaneous faults and invalid bounded numeric inputs', () => {
    const spec = scenarioSpec('approval-delay');
    spec.faults = [...spec.faults, { id: 'second', kind: 'duplicate-purchase-proposal' }]; expect(() => createWorkflow(spec)).toThrow();
    for (const value of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER, 1.5]) {
      const invalid = scenarioSpec(); invalid.task.demand = value; invalid.fixtureDigest = digest(invalid.task); expect(() => createWorkflow(invalid)).toThrow();
    }
  });
  it('replays journal-bound exhaustion without growing the bounded journal', () => {
    let s = createWorkflow(); for (let n = 0; n < 101; n++) s = workflowReducer(s, { type: 'recover', blockedEventId: 'invalid' });
    expect(s.status).toBe('budget-exhausted'); expect(s.journal).toHaveLength(100); expect(importWorkflow(exportWorkflow(s)).ok).toBe(true);
  });
});
