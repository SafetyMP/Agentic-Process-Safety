import { describe, expect, it } from 'vitest';
import { createComparison } from './comparison.ts';
import { blankFields, costEstimate, eligibleUpdates, handoffBrief, handoffFields, pilotBrief, pilotFields } from './audience.ts';
import { discussionMarkdown, initialSession, parseSession, serializeSession, sessionReducer } from './session.ts';
import { comparisonCsv, recordedCsv } from './replication.ts';

const make = (age: number, id = 1) => createComparison('comparison-' + id, { caseId: 'stale', approvalAge: String(age) });
describe('purchasing audience artifacts', () => {
  it('ties each alternative and sponsor decision to its run through a save and restore', () => {
    let session = sessionReducer(initialSession(), { type: 'run' });
    const inbound = { ...blankFields(handoffFields), disposition: 'Close after checking inbound', owner: 'Planner Day' };
    const shortage = { ...blankFields(handoffFields), disposition: 'Seek current approval', owner: 'Buyer Night' };
    const pilot = { ...blankFields(pilotFields), decision: 'Defer pending evidence' };
    session = sessionReducer(session, { type: 'discussion', id: 'comparison-1', patch: { fieldWork: { selected: 'inbound', drafts: { inbound, shortage } }, pilot } });
    session = sessionReducer(session, { type: 'run' });
    const restored = parseSession(serializeSession(session));
    expect(restored).toEqual(session);
    expect(restored.discussions['comparison-2']).toBeUndefined();
    const handoff = handoffBrief(restored.runs[0], 'inbound', inbound);
    expect(handoff).toContain('Planner Day');
    expect(handoff).not.toContain('Buyer Night');
    expect(handoff).toContain('PO-417');
    expect(discussionMarkdown(restored)).toContain('Buyer Night');
    expect(discussionMarkdown(restored)).toContain(pilot.decision);
  });
  it('restores older sessions without assigning them a new source build', () => {
    const raw = JSON.parse(serializeSession(sessionReducer(initialSession(), { type: 'run' })));
    delete raw.session.runs[0].build;
    expect(parseSession(JSON.stringify(raw)).runs[0].build).toBeUndefined();
  });
  it('limits fictional records to eligible comparisons and rejects cross-case saved updates', () => {
    expect(eligibleUpdates(make(59))).toEqual([]);
    expect(eligibleUpdates(make(60))).toEqual(['inbound','shortage']);
    let session = sessionReducer(initialSession(), { type: 'run' });
    session = sessionReducer(session, { type: 'discussion', id: 'comparison-1', patch: { fieldWork: { selected: 'replay', drafts: {} } } });
    expect(() => parseSession(serializeSession(session))).toThrow('purchasing update');
  });
  it('exports original or hypothetical context and explicitly supplied cost assumptions', () => {
    const pilot = blankFields(pilotFields);
    expect(costEstimate(pilot)).toContain('Enter three');
    expect(costEstimate({ ...pilot, minutes:'15',rate:'40',expedite:'0' })).toContain('10.00');
    const child = createComparison('comparison-2', { caseId:'stale',approvalAge:'0' }, undefined, make(61));
    expect(pilotBrief(child,pilot)).toContain('Hypothetical recovery from comparison-1, lane C');
  });
  it('preserves row units, source identities, and distinct trial denominators', () => {
    const rows = comparisonCsv([make(59),make(60,2),make(61,3)]).trim().split('\r\n');
    expect(rows).toHaveLength(7);
    expect(rows[2]).toMatch(/"C","allow","1"$/);
    expect(rows[4]).toMatch(/"C","deny","0"$/);
    expect(rows[6]).toMatch(/"C","deny","0"$/);
    expect(recordedCsv()).toContain('"000-stale_approval"');
    expect(recordedCsv()).toContain('"attack_calls"');
    expect(recordedCsv()).not.toContain('comparison-');
  });
});
