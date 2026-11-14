import { describe, expect, it } from 'vitest';
import { caseDefinitions, presetDraft } from './cases.ts';
import { createComparison } from './comparison.ts';
import { decisionPath, laneMeaning, runTitle } from './presentation.ts';

const stale = (age: number) => createComparison('comparison-1', { caseId: 'stale', approvalAge: String(age) });

describe('retained run presentation', () => {
  it('describes current inputs without relabeling an expired historical request', () => {
    const expired = stale(61);
    const current = stale(59);
    expect(runTitle(expired)).toBe('Purchase after approval expiry');
    expect(runTitle(current)).toBe('Purchase with current approval');
    expect(runTitle(stale(60))).toBe('Purchase after approval expiry');
    expect(expired.request.approvalAge).toBe(61);
    expect(current.caseId).toBe('stale');
  });
  it('labels renewed approval as a hypothetical child with its parent intact', () => {
    const parent = stale(61);
    const child = createComparison('comparison-2', { caseId: 'stale', approvalAge: '0' }, undefined, parent);
    expect(runTitle(child)).toBe('Hypothetical purchase with renewed approval');
    expect(decisionPath(child)[0].detail).toContain('earlier C lane’s unchanged state');
    expect(parent.results.C.executed).toBe(false);
  });
  it('separates execution status from the validity meaning of the result', () => {
    expect(laneMeaning(stale(61).results.B)).toEqual({ tone: 'violation', label: 'Invalid condition carried into execution' });
    expect(laneMeaning(stale(61).results.C)).toEqual({ tone: 'held', label: 'Modeled boundary held · request stopped' });
    expect(laneMeaning(stale(59).results.C).tone).toBe('clear');
    expect(laneMeaning(stale(59).results.A).label).toContain('No checks applied');
    expect(laneMeaning(createComparison('comparison-1', presetDraft('conflict')).results.C)).toEqual({ tone: 'review', label: 'Review needed · question unresolved' });
  });
});

describe('case-specific decision path', () => {
  it.each(caseDefinitions)('$id has five bounded stages and cannot change its request or results', definition => {
    const run = createComparison('comparison-1', presetDraft(definition.id));
    const original = JSON.stringify(run);
    const path = decisionPath(run);
    expect(path.map(stage => stage.id)).toEqual(['premise', 'condition', 'request', 'checks', 'effects']);
    expect(path[2].detail).toContain('same starting state');
    expect(path[2].detail).toContain('Only their check bundles differ');
    expect(path[2].value).toContain(String(run.request.amount));
    if (definition.effectMode === 'unmodeled') {
      expect(path[4].type).toBe('Unmodeled business outcome');
      expect(path[4].value).toBe('No downstream effects projected');
      expect(path[4].detail).toContain('Business effects are not modeled');
    }
    expect(JSON.stringify(run)).toBe(original);
  });
  it.each([59, 60, 61])('makes the strict expiry boundary concrete at age %i', age => {
    const path = decisionPath(stale(age));
    expect(path[1].title).toBe(age < 60 ? 'Approval remains current' : 'Approval expires');
    expect(path[1].value).toContain(`${age}s`);
    expect(path[1].detail).toContain('Age 60 already fails');
    expect(path[4].title).toBe(age < 60 ? 'Illustrative order created' : 'Purchase remains outstanding');
    expect(path[4].type).toBe('Illustrative projection');
  });
  it('frames objective conflict without irrelevant elapsed time or invented arbitration', () => {
    const path = decisionPath(createComparison('comparison-1', presetDraft('conflict')));
    expect(path[0].title).toBe('Competing goals declared');
    expect(path[1].title).toBe('Trade-off remains unresolved');
    expect(path[3].title).toBe('C asks for a human decision');
    expect(path[3].detail).toContain('no arbitration or human authorization occurs');
    expect(path[4].title).toBe('Decision remains outstanding');
    expect(JSON.stringify(path)).not.toMatch(/logical seconds|Approval expires|C: .* orders/);
  });
  it('keeps context substitution separate from a live prompt-injection claim', () => {
    const path = decisionPath(createComparison('comparison-1', presetDraft('context')));
    expect(path[1].title).toBe('Context belongs elsewhere');
    expect(path[1].detail).toContain('not an observed agent following injected instructions');
    expect(path[1].detail).toContain('related recorded case tests a demand-stage request');
  });
  it('uses the actual preset condition for authority, spend, delegation, approval and replay', () => {
    const expected = [
      ['unauthorized', 'Purchase authority absent', 'Actor: supplier'],
      ['spending', 'Request exceeds ceiling', '1200 sandbox units requested'],
      ['delegation', 'Delegation exceeds limit', 'Depth 4 · limit 3'],
      ['approval', 'Matching approval absent', 'Approval flag: missing'],
      ['replay', 'Nonce marked consumed', 'Replay flag: true'],
    ] as const;
    for (const [caseId, title, value] of expected) {
      const path = decisionPath(createComparison('comparison-1', presetDraft(caseId)));
      expect(path[1]).toMatchObject({ title, value });
    }
  });
});
