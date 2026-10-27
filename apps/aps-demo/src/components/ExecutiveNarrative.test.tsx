// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ExecutiveDiscussion, ExecutiveOutcome, useExecutiveDiscussion } from './ExecutiveNarrative.tsx';
import { HazopConversation } from './HazopConversation.tsx';
import { AudienceProvider, Executive } from './AudienceView.tsx';
import { App } from '../App.tsx';
import { hazards } from '../data.ts';
import * as workflowAPI from '../workflow/index.ts';
import type { Mode, ScenarioId, WorkflowState } from '../workflow/index.ts';
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.location.hash = ''; });
function finish(scenario: ScenarioId, mode: Mode = 'C') { let state = workflowAPI.createWorkflow(workflowAPI.scenarioSpec(scenario, mode)); for (let i = 0; i < 100 && workflowAPI.selectWorkflow(state).controls.canStep; i++) state = workflowAPI.workflowReducer(state, { type: 'step' }); return state; }
async function route(hash: string) { await act(async () => { window.location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); }); }
const more = () => screen.getByRole('radio', { name: 'More evidence before a recommendation' });
it('names Executive navigation links without decorative sequence numbers', () => {
  render(<App/>);
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
  for (const name of ['Why APS matters', 'How controls work', 'What leaders decide']) expect(within(navigation).getByRole('link', { name })).toBeTruthy();
});
it.each([
  ['Executive', ['Question to examine', 'Purchasing authority model (A/B/C)', 'Which proposal goes first?', 'Playback pace']],
  ['Technical', ['Workflow scenario', 'Workflow comparator', 'Proposal schedule', 'Playback pace']],
] as const)('gives %s workflow selects exact visible labels without option text', (audience, names) => {
  window.location.hash = '#/simulator'; render(<App/>);
  fireEvent.click(screen.getByRole('radio', { name: audience }));
  if (audience === 'Executive') fireEvent.click(screen.getByText('Exercise settings', { selector: 'summary' }));
  for (const name of names) {
    const control = screen.getByRole('combobox', { name });
    const labelId = control.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const label = document.getElementById(labelId!);
    expect(label?.textContent).toBe(name);
    expect(label?.querySelector('option')).toBeNull();
    expect(control.closest('label')?.contains(label)).toBe(true);
  }
});
it('leads with the business task, actual supplied need and all six distinct responsibilities', () => {
  window.location.hash = '#/overview'; const commands = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Delegate work. Keep control of the outcome.');
  expect(screen.getByText(/Your task: examine one purchasing question/)).toBeTruthy();
  expect(document.querySelector('main')!.textContent!.indexOf('Delegate work.')).toBeLessThan(document.querySelector('main')!.textContent!.indexOf('Task task-1'));
  fireEvent.click(screen.getByText('Who hands work to whom?', { selector: 'summary' }));
  const roles = screen.getByText('Who hands work to whom?', { selector: 'summary' }).parentElement!;
  expect(Array.from(roles.querySelectorAll('li strong')).map(e => e.textContent)).toEqual(['Orchestrator:', 'Demand:', 'Inventory:', 'Supplier:', 'Finance:', 'Purchase:']);
  expect(roles.textContent).toContain('own the commitment path and confirm its outcome'); expect(commands).not.toHaveBeenCalled();
});
it('places actions before actual records, preserves question drafts and exposes settings without commands', async () => {
  window.location.hash = '#/simulator'; const commands = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  const controls = document.querySelector('[aria-labelledby=workflow-controls-title]')!; const records = screen.getByRole('region', { name: 'Purchasing operations' });
  expect(controls.compareDocumentPosition(records) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Question to examine'), { target: { value: 'approval-delay' } });
  fireEvent.click(screen.getByText('Exercise settings', { selector: 'summary' }));
  await act(async () => {});
  fireEvent.change(screen.getByLabelText('Purchasing authority model (A/B/C)'), { target: { value: 'A' } });
  expect(commands).not.toHaveBeenCalled(); expect(screen.getByText(/Active: Nominal procurement/)).toBeTruthy();
  await route('#/assurance'); await route('#/simulator');
  expect((screen.getByText('Exercise settings', { selector: 'summary' }).parentElement as HTMLDetailsElement).open).toBe(true);
  expect((screen.getByLabelText('Question to examine') as HTMLSelectElement).value).toBe('approval-delay');
  fireEvent.click(screen.getByRole('button', { name: 'Apply selection and start new run' }));
  expect(commands.mock.calls.map(([, command]) => command.type)).toEqual(['configure']);
  expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('0 transitions');
});
const moreFinding = hazards.find(h => h.node === 'purchase' && h.deviation === 'MORE')!;
it.each([
  ['#/hazop', 'What can depart from intended purchasing?'],
  ['#/hazop?hazard=APS-f47191931b96a999a61c', 'What could go wrong between permission and purchase?'],
  [`#/hazop?hazard=${moreFinding.id}`, 'What can depart from intended purchasing?'],
  ['#/hazop?hazard=not-a-finding', 'What can depart from intended purchasing?'],
])('preserves exact HAZOP context for %s', (hash, headline) => {
  window.location.hash = hash; render(<App/>); expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(headline);
  if (hash.includes(moreFinding.id)) expect(screen.getByRole('region', { name: 'HAZOP design review' }).textContent).toContain(moreFinding.id);
  if (hash.includes('not-a-finding')) expect(screen.getByText(/Requested finding unavailable; showing the current source fallback/)).toBeTruthy();
});
it.each(['purchase-race', 'lost-purchase-response'] as const)('does not turn a selected %s event into a timing cause', scenario => {
  const state = finish(scenario); const event = state.events.find(e => e.type === 'order-committed')!; const before = workflowAPI.exportWorkflow(state);
  render(<HazopConversation state={state} context={{ taskId: state.spec.task.id, specKey: state.runKey, eventId: event.id }}/>);
  const separate = screen.getByRole('region', { name: 'Separate selected record context' });
  expect(separate.textContent).toContain('does not demonstrate the approval-expiry cause');
  expect(screen.getByText(/Selected actual event:/).textContent).toContain(event.id);
  expect(screen.getByText('Related timing finding—different object/coverage')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Next review question' }));
  expect(workflowAPI.exportWorkflow(state)).toBe(before);
});
it.each(['A', 'B', 'C'] as const)('distinguishes actual expiry outcomes for %s without inventing business impacts', mode => {
  const state = finish('approval-delay', mode); render(<ExecutiveOutcome state={state}/>);
  const result = screen.getByRole('region', { name: 'Observed purchasing result' });
  expect(result.textContent).toContain(mode === 'C' ? 'Expired permission stopped this attempt.' : 'An order was recorded outside the modeled safeguards.');
  expect(result.textContent).toContain('business costs/benefits and acceptable residual risk are not established');
  if (mode !== 'C') expect(result.textContent).toContain('Task confirmed does not mean acceptable completion');
});
it.each(['nominal', 'lost-purchase-response'] as const)('uses the actual %s result, not a fabricated completion claim', scenario => {
  const state = finish(scenario); render(<ExecutiveOutcome state={state}/>);
  expect(screen.getByRole('region', { name: 'Observed purchasing result' }).textContent).toContain(scenario === 'nominal' ? "The purchase is confirmed within the model's checks." : 'An order is recorded; the reply is missing.');
});
function MemoryHarness({ initial }: { initial: WorkflowState }) {
  const [state, setState] = useState(initial); const discussion = useExecutiveDiscussion(state, null);
  return <><button onClick={() => setState(workflowAPI.workflowReducer(state, { type: 'reset' }))}>Reset observed model</button><button onClick={() => setState(workflowAPI.workflowReducer(state, { type: 'configure', spec: state.spec }))}>Repeat identical specification</button><button onClick={() => { const replay = workflowAPI.importWorkflow(workflowAPI.exportWorkflow(state)); if (!replay.ok) throw new Error('Fixture import failed'); setState(replay.state); }}>Import identical replay</button><Executive><ExecutiveDiscussion discussion={discussion}/></Executive></>;
}
it('refreshes a checked discussion position with Space without issuing workflow commands', () => {
  render(<AudienceProvider><MemoryHarness initial={workflowAPI.createWorkflow()}/></AudienceProvider>);
  fireEvent.click(more()); fireEvent.click(screen.getByRole('button', { name: 'Reset observed model' }));
  const status = screen.getByRole('status', { name: 'Discussion draft status' });
  expect(status.textContent).toContain('The run has changed');
  const commands = vi.spyOn(workflowAPI, 'workflowReducer');
  more().focus(); fireEvent.keyDown(more(), { key: ' ' });
  expect(status.textContent).not.toContain('The run has changed');
  expect(commands).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(more());
});
it.each(['Reset observed model', 'Repeat identical specification', 'Import identical replay'])('stales a discussion for %s even when runKey and values recur', action => {
  const initial = workflowAPI.createWorkflow(); render(<AudienceProvider><MemoryHarness initial={initial}/></AudienceProvider>);
  expect(screen.getByText('No purchasing decision observed; these positions are hypotheses.')).toBeTruthy();
  const calls = vi.spyOn(workflowAPI, 'workflowReducer'); const storage = vi.spyOn(Storage.prototype, 'setItem');
  fireEvent.click(more()); expect(calls).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: action }));
  const status = screen.getByRole('status', { name: 'Discussion draft status' }); expect(status.textContent).toBe('The run has changed—review this draft again.');
  fireEvent.click(screen.getByRole('radio', { name: 'Technical' })); fireEvent.click(screen.getByRole('radio', { name: 'Executive' }));
  expect(status.textContent).toBe('The run has changed—review this draft again.');
  const count = calls.mock.calls.length; fireEvent.click(more(), { detail: 0 }); // Native keyboard activation protocol; actual Space is covered in the pending browser runner.
  expect(status.textContent).not.toContain('The run has changed'); expect(calls.mock.calls).toHaveLength(count); expect(storage).not.toHaveBeenCalled();
});
it('retains the original observed snapshot while stale and discards memory on remount', () => {
  const h = render(<AudienceProvider><MemoryHarness initial={finish('nominal')}/></AudienceProvider>); fireEvent.click(more());
  fireEvent.click(screen.getByText('Observations attached to this discussion', { selector: 'summary' }));
  const snapshot = screen.getByText('Observations attached to this discussion', { selector: 'summary' }).parentElement!.textContent;
  expect(snapshot).toContain('1 orders'); fireEvent.click(screen.getByRole('button', { name: 'Reset observed model' }));
  fireEvent.click(screen.getByRole('button', { name: 'Repeat identical specification' }));
  expect(screen.getByText('Observations attached to this discussion', { selector: 'summary' }).parentElement!.textContent).toBe(snapshot);
  expect(screen.getByRole('status', { name: 'Discussion draft status' }).textContent).toContain('The run has changed');
  h.unmount(); render(<AudienceProvider><MemoryHarness initial={workflowAPI.createWorkflow()}/></AudienceProvider>); expect((more() as HTMLInputElement).checked).toBe(false);
});
it('preserves discussion across App routes and audience changes without issuing commands', async () => {
  window.location.hash = '#/assurance'; const calls = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  const draft = screen.getByRole('region', { name: 'Non-binding discussion draft' });
  expect(within(draft).queryByRole('button', { name: /approve|accept|save/i })).toBeNull();
  fireEvent.click(more()); const status = screen.getByRole('status', { name: 'Discussion draft status' }).textContent;
  await route('#/overview'); await route('#/assurance');
  for (const name of ['Technical', 'Executive']) fireEvent.click(screen.getByRole('radio', { name }));
  expect(screen.getByRole('status', { name: 'Discussion draft status' }).textContent).toBe(status); expect((more() as HTMLInputElement).checked).toBe(true); expect(calls).not.toHaveBeenCalled();
});


it('keeps a single Executive action band in question/consequence/Apply/active/Start/settings DOM order without issuing commands', () => {
  window.location.hash = '#/simulator'; const commands = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  const question = screen.getByLabelText('Question to examine'); const consequence = screen.getByText(/Apply replaces this run’s world, history and metrics/);
  const apply = screen.getByRole('button', { name: 'Apply selection and start new run' }); const active = document.querySelector('.workflow-active')!;
  const start = screen.getByRole('button', { name: 'Start workflow' }); const settings = screen.getByText('Exercise settings', { selector: 'summary' });
  const sequence = [question, consequence, apply, active, start, settings];
  for (let i = 1; i < sequence.length; i++) expect(sequence[i - 1].compareDocumentPosition(sequence[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Apply selection and start new run' })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: 'Start workflow' })).toHaveLength(1); expect(commands).not.toHaveBeenCalled();
});
