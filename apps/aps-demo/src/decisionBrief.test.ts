import { describe, expect, it } from 'vitest';
import { captureBriefSnapshot, createDecisionBrief, exportDecisionBrief, importDecisionBrief, MAX_BRIEF_BYTES } from './decisionBrief.ts';
import { createWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from './workflow/index.ts';

function example() {
  let state = createWorkflow(scenarioSpec('lost-purchase-response'));
  for (let i = 0; i < 100 && selectWorkflow(state).controls.canStep; i++) state = workflowReducer(state, { type: 'step' });
  const brief = createDecisionBrief(captureBriefSnapshot(state, 'run-instance-1', 'observation-1', state.unknownEventId));
  brief.notes.owner = 'Process owner'; brief.notes.decision = 'Reconcile the existing order before considering a retry.';
  brief.position = 'Check for an existing order before retrying';
  return { state, brief };
}
it('round-trips the complete notes, scoped inputs and observed unknown outcome without replaying or relabeling it', () => {
  const { state, brief } = example();
  const before = JSON.stringify(state);
  const imported = importDecisionBrief(exportDecisionBrief(brief));
  expect(imported).toEqual({ ok: true, brief });
  expect(brief.snapshot).toMatchObject({ orders: 1, confirmed: false, status: 'outcome-unknown', runId: 'run-instance-1', observationId: 'observation-1', modelVersion: 'procurement-local/1' });
  expect(brief.snapshot.selectedEventId).toBe(state.unknownEventId);
  expect(JSON.stringify(state)).toBe(before);
});
it('captures independent inputs and observations so later run changes cannot rewrite a brief', () => {
  const { state, brief } = example(); const before = JSON.stringify(brief.snapshot);
  const reset = workflowReducer(state, { type: 'reset' });
  expect(reset.world.orders).toHaveLength(0); expect(JSON.stringify(brief.snapshot)).toBe(before);
  expect(brief.snapshot.spec).not.toBe(state.spec); expect(brief.snapshot.spec.task).not.toBe(state.spec.task);
});
describe('portable brief validation', () => {
  it.each([
    ['unsupported format', (b: Record<string, unknown>) => { b.schemaVersion = 'aps-decision-brief/2'; }],
    ['approval status', (b: Record<string, unknown>) => { b.status = 'approved'; }],
    ['authority claim', (b: Record<string, unknown>) => { b.simulationOnly = false; }],
    ['unknown field', (b: Record<string, unknown>) => { b.approver = 'Executive'; }],
    ['oversized role', (b: Record<string, unknown>) => { (b.notes as Record<string, unknown>).owner = 'x'.repeat(201); }],
    ['invalid snapshot', (b: Record<string, unknown>) => { (b.snapshot as Record<string, unknown>).orders = 90; }],
    ['unsupported model', (b: Record<string, unknown>) => { (b.snapshot as Record<string, unknown>).modelVersion = 'live-prod'; }],
    ['incoherent scenario', (b: Record<string, unknown>) => { (b.snapshot as Record<string, unknown>).scenario = 'Nominal procurement'; }],
    ['unbounded input', (b: Record<string, unknown>) => { const s = b.snapshot as Record<string, unknown>; (s.spec as Record<string, unknown>).limits = { maxTransitions: 999999 }; }],
  ])('rejects %s', (_name, change) => {
    const { brief } = example(); const doc = JSON.parse(exportDecisionBrief(brief)) as Record<string, unknown>; change(doc);
    expect(importDecisionBrief(JSON.stringify(doc)).ok).toBe(false);
  });
  it('rejects malformed, duplicate-key and byte-oversized JSON', () => {
    const text = exportDecisionBrief(example().brief);
    expect(importDecisionBrief('{').ok).toBe(false);
    expect(importDecisionBrief(text.replace('"simulationOnly": true', '"simulationOnly": false, "simulationOnly": true')).ok).toBe(false);
    expect(importDecisionBrief(' '.repeat(MAX_BRIEF_BYTES) + text).ok).toBe(false);
    expect(importDecisionBrief('💬'.repeat(MAX_BRIEF_BYTES / 3)).ok).toBe(false);
  });
  it('rejects deeply nested discarded duplicate values without throwing', () => {
    const text = exportDecisionBrief(example().brief);
    for (const nested of ['['.repeat(10000) + '0' + ']'.repeat(10000), '{"x":'.repeat(10000) + '0' + '}'.repeat(10000)]) {
      const hiddenDuplicate = text.replace('"notes": {', `"notes": ${nested}, "notes": {`);
      expect(new TextEncoder().encode(hiddenDuplicate).length).toBeLessThan(MAX_BRIEF_BYTES);
      expect(() => importDecisionBrief(hiddenDuplicate)).not.toThrow();
      expect(importDecisionBrief(hiddenDuplicate).ok).toBe(false);
    }
  });
  it('does not mistake quoted or escaped bracket text for source nesting', () => {
    const { brief } = example(); brief.notes.evidence = '[{"quoted":"\\\\"}]'.repeat(100);
    expect(importDecisionBrief(exportDecisionBrief(brief))).toEqual({ ok: true, brief });
  });
  it('treats markup as plain discussion text and rejects nested prototype keys', () => {
    const { brief } = example(); brief.notes.decision = '<script>untrusted()</script>';
    const result = importDecisionBrief(exportDecisionBrief(brief)); expect(result.ok).toBe(true);
    const malicious = exportDecisionBrief(brief).replace('"owner": "Process owner"', '"owner": "Process owner", "__proto__": {}');
    expect(importDecisionBrief(malicious).ok).toBe(false);
  });
});
