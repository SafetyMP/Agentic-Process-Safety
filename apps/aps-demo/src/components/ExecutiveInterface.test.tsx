// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../App.tsx';
import { AudienceProvider } from './AudienceView.tsx';
import { WorkflowStage } from './WorkflowStage.tsx';
import { Simulator } from '../routes/Simulator.tsx';
import { createWorkflow, exportWorkflow, importWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from '../workflow/index.ts';
import type { Mode, ScenarioId, WorkflowCommand } from '../workflow/index.ts';
import * as workflowAPI from '../workflow/index.ts';
import * as policyAPI from '../domain/simulation.ts';
import { initialState, reducer } from '../domain/simulation.ts';
import type { Action } from '../domain/simulation.ts';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); window.location.hash = ''; vi.useRealTimers(); vi.restoreAllMocks(); });
const switchTo = (name: 'Executive' | 'Technical') => fireEvent.click(screen.getByRole('radio', { name }));
function end(scenario: ScenarioId, mode: Mode, schedule: 'proposal-1-first' | 'proposal-2-first' = 'proposal-1-first') {
  let s = createWorkflow(scenarioSpec(scenario, mode, schedule));
  for (let i = 0; i < 100 && selectWorkflow(s).controls.canStep; i++) s = workflowReducer(s, { type: 'step' });
  return s;
}
function setup(initial = createWorkflow(scenarioSpec()), policy = initialState(42, 'C', 'normal')) {
  let current = initial; let p = policy;
  const commands: WorkflowCommand[] = []; const actions: Action[] = [];
  function Harness() {
    const [state, setState] = useState(initial); current = state;
    const [single, setSingle] = useState(policy); p = single;
    return <AudienceProvider><WorkflowStage state={state} onCommand={command => { commands.push(command); setState(s => workflowReducer(s, command)); }} onExport={() => exportWorkflow(state)} onImport={text => {
      const result = importWorkflow(text);
      if (!result.ok) return { ok: false, message: `${result.code}: ${result.message}` };
      setState(workflowReducer(result.state, { type: 'pause' })); return { ok: true, message: 'Imported supported replay' };
    }}/><Simulator state={single} dispatch={action => { actions.push(action); setSingle(s => reducer(s, action)); }}/></AudienceProvider>;
  }
  render(<Harness/>);
  return { state: () => current, policy: () => p, commands, actions };
}
const headings = {
  overview: 'Keep purchasing moving, within agreed limits.', simulator: 'What should happen when the purchase cannot proceed as planned?',
  governance: 'Where must delegated purchasing stop?', hazop: 'What could make a completed purchase unacceptable?', assurance: 'What evidence would justify the next decision?',
};
it.each(Object.entries(headings))('opens %s as a decision brief, not a technical dashboard', (route, heading) => {
  window.location.hash = `#/${route}`; render(<App/>);
  expect((screen.getByRole('radio', { name: 'Executive' }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(heading);
  expect(document.querySelector('[data-executive-uncertainty]')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Procurement topology' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Trial ledger' })).toBeNull();
  const nav = screen.getByRole('navigation', { name: 'Main navigation' });
  expect(Array.from(nav.querySelectorAll('a')).map(a => a.getAttribute('href'))).toEqual(['#/overview', '#/simulator', '#/governance', '#/hazop', '#/assurance']);
  expect(nav.querySelectorAll('[aria-current=page]')).toHaveLength(1);
  switchTo('Technical'); expect((screen.getByRole('radio', { name: 'Technical' }) as HTMLInputElement).checked).toBe(true);
  switchTo('Executive'); expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(heading);
});
for (const scenario of ['nominal', 'approval-delay', 'purchase-race', 'lost-purchase-response'] as const) for (const mode of ['A', 'B', 'C'] as const) {
  it(`${scenario}/${mode}: first toggle and return preserve exact effects, controls and uncertainty`, () => {
    const h = setup(end(scenario, mode)); const before = h.state(); const replay = exportWorkflow(before); const view = selectWorkflow(before);
    const result = screen.getByRole('region', { name: 'Business purchasing outcome' });
    expect(result.textContent).toContain(`${view.metrics.spent} simulated units`);
    expect(result.textContent).toContain('Delivery, supplier performance and real authorization remain outside this evidence');
    const states = () => Array.from(document.querySelectorAll('.workflow-workspace button:not([data-technical] button), .workflow-workspace select')).map(x => ({ text: x.textContent, disabled: (x as HTMLButtonElement).disabled }));
    // Compare disabled states rather than audience-specific explanatory labels.
    const disabled = states().map(x => x.disabled);
    for (const audience of ['Technical', 'Executive'] as const) {
      switchTo(audience); expect(h.state()).toBe(before); expect(exportWorkflow(h.state())).toBe(replay); expect(h.commands).toEqual([]);
      expect(states().map(x => x.disabled)).toEqual(disabled);
      expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain(before.status.replaceAll('-', ' '));
    }
    if (scenario === 'approval-delay' && mode !== 'C') {
      expect(view.metrics.completed).toBe(true); expect(view.metrics.deniedProposals).toBe(0); expect(view.metrics.unsafeCommittedEffects).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: 'Request one approval refresh' })).toBeNull();
      expect(screen.getByRole('region', { name: 'Purchasing situation' }).textContent).toContain('A/B may confirm despite expiry without a denial or refresh control');
    }
    if (scenario === 'approval-delay' && mode === 'C') { expect(view.controls.canRecover).toBe(true); expect(view.metrics.committedOrders).toBe(0); }
    if (scenario === 'lost-purchase-response') { expect(view.metrics.committedOrders).toBeGreaterThan(0); }
  });
}
it.each(['proposal-1-first', 'proposal-2-first'] as const)('preserves defended single-order race schedule %s', schedule => {
  const h = setup(end('purchase-race', 'C', schedule)); const before = exportWorkflow(h.state());
  expect(selectWorkflow(h.state()).metrics.committedOrders).toBe(1);
  switchTo('Technical'); expect(exportWorkflow(h.state())).toBe(before);
  switchTo('Executive'); expect(exportWorkflow(h.state())).toBe(before);
});
it('retains unsaved drafts, selected records, stale prepared export and invalid replay on the FIRST toggle', () => {
  const h = setup(); switchTo('Technical');
  fireEvent.change(screen.getByLabelText('Workflow scenario'), { target: { value: 'purchase-race' } });
  fireEvent.change(screen.getByLabelText('Workflow comparator'), { target: { value: 'A' } });
  fireEvent.change(screen.getByLabelText('Proposal schedule'), { target: { value: 'proposal-2-first' } });
  fireEvent.change(screen.getByLabelText('Playback pace'), { target: { value: '1400' } });
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
  const agent = document.querySelector<HTMLButtonElement>('.workflow-agent')!; fireEvent.click(agent);
  const timeline = document.querySelector<HTMLButtonElement>('.workflow-timeline button')!; fireEvent.click(timeline);
  const message = document.querySelector<HTMLButtonElement>('[aria-labelledby=workflow-messages-title] tbody button')!; fireEvent.click(message);
  const selectedAgent = document.querySelector('.workflow-agent[aria-pressed=true]')!.textContent;
  const selectedEvent = document.querySelector('.workflow-timeline button[aria-pressed=true]')!.textContent;
  const selectedMessage = document.querySelector('[aria-labelledby=workflow-messages-title] button[aria-pressed=true]')!.textContent;
  fireEvent.click(screen.getByRole('button', { name: 'Prepare current replay JSON' }));
  const stale = (screen.getByLabelText('Prepared replay snapshot') as HTMLTextAreaElement).value;
  fireEvent.click(screen.getByRole('button', { name: 'Step one transition' })); expect(exportWorkflow(h.state())).not.toBe(stale);
  fireEvent.change(screen.getByLabelText('Replay JSON to validate'), { target: { value: '{not-json' } });
  fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
  const error = screen.getByRole('status', { name: 'Replay import status' }).textContent; expect(error).toContain('invalid-json');
  const before = h.state(); const commandCount = h.commands.length;
  for (const audience of ['Executive', 'Technical'] as const) {
    switchTo(audience); expect(h.state()).toBe(before); expect(h.commands).toHaveLength(commandCount);
    expect((document.querySelector('[aria-labelledby=workflow-controls-title] select') as HTMLSelectElement).value).toBe('purchase-race');
    expect((screen.getByLabelText('Prepared replay snapshot') as HTMLTextAreaElement).value).toBe(stale);
    expect((screen.getByLabelText('Replay JSON to validate') as HTMLTextAreaElement).value).toBe('{not-json');
    expect(screen.getByLabelText('Replay JSON to validate').getAttribute('maxlength')).toBe('262144');
    expect(screen.getByRole('status', { name: 'Replay import status', hidden: true }).textContent).toBe(error);
    expect(document.querySelector('.workflow-agent[aria-pressed=true]')!.textContent).toBe(selectedAgent);
    expect(document.querySelector('.workflow-timeline button[aria-pressed=true]')!.textContent).toBe(selectedEvent);
    expect(document.querySelector('[aria-labelledby=workflow-messages-title] button[aria-pressed=true]')!.textContent).toBe(selectedMessage);
  }
  expect((screen.getByLabelText('Workflow comparator') as HTMLSelectElement).value).toBe('A');
  expect((screen.getByLabelText('Proposal schedule') as HTMLSelectElement).value).toBe('proposal-2-first');
  expect((screen.getByLabelText('Playback pace') as HTMLSelectElement).value).toBe('1400');
});
it('preserves oversized replay rejection and current run', () => {
  const h = setup(); switchTo('Technical');
  // Direct import validation uses the actual engine bound, not a weakened UI maxLength.
  const oversized = 'x'.repeat(262145); const initial = h.state();
  const result = importWorkflow(oversized); expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe('resource-limit');
  fireEvent.change(screen.getByLabelText('Replay JSON to validate'), { target: { value: oversized } });
  fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
  const error = screen.getByRole('status', { name: 'Replay import status' }).textContent;
  expect(error).toContain('resource-limit');
  for (const name of ['Executive', 'Technical'] as const) { switchTo(name); expect(h.state()).toBe(initial); expect((screen.getByLabelText('Replay JSON to validate') as HTMLTextAreaElement).value).toBe(oversized); expect(screen.getByRole('status', { name: 'Replay import status', hidden: true }).textContent).toBe(error); }
});
it.each(['recover', 'reconcile'] as const)('retains exception history and invokes %s once through the original control', command => {
  const h = setup(end(command === 'recover' ? 'approval-delay' : 'lost-purchase-response', 'C'));
  const denied = selectWorkflow(h.state()).metrics.deniedProposals; const oldOrders = h.state().world.orders.map(x => x.id);
  switchTo('Technical'); switchTo('Executive'); expect(h.commands).toEqual([]);
  fireEvent.click(screen.getByRole('button', { name: command === 'recover' ? 'Request one approval refresh' : 'Reconcile existing order once' }));
  expect(h.commands.filter(c => c.type === command)).toHaveLength(1);
  for (let i = 0; i < 100 && selectWorkflow(h.state()).controls.canStep; i++) fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
  expect(selectWorkflow(h.state()).metrics.deniedProposals).toBe(denied);
  expect(h.state().world.orders).toHaveLength(1);
  if (command === 'reconcile') expect(h.state().world.orders.map(x => x.id)).toEqual(oldOrders);
});
it('retains queued and evaluated faults, pending review and both original choices', () => {
  const h = setup(createWorkflow(scenarioSpec()), initialState(42, 'C', 'normal'));
  fireEvent.change(screen.getByLabelText('Possible disruption'), { target: { value: 'conflict' } });
  fireEvent.click(screen.getByRole('button', { name: 'Inject selected fault' }));
  const queued = h.policy();
  for (const audience of ['Technical', 'Executive'] as const) { switchTo(audience); expect(h.policy()).toBe(queued); expect(screen.getByText('Queued override: Conflicting agent objectives')).toBeTruthy(); }
  for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Step' }));
  const pending = h.policy(); expect(pending.pending).not.toBeNull(); const length = h.actions.length;
  for (const audience of ['Technical', 'Executive'] as const) { switchTo(audience); expect(h.policy()).toBe(pending); expect(h.actions).toHaveLength(length); expect(screen.getByRole('button', { name: 'Deny simulated request' })).toBeTruthy(); expect(screen.getByRole('button', { name: 'Approve simulated request' })).toBeTruthy(); expect(screen.getByText('Evaluated override: Conflicting agent objectives')).toBeTruthy(); }
  fireEvent.click(screen.getByRole('button', { name: 'Deny simulated request' })); expect(h.actions.filter(a => a.type === 'resolve')).toEqual([{ type: 'resolve', approved: false }]);
});
it('preserves audience across in-app navigation and pauses only on workflow route departure', async () => {
  window.location.hash = '#/simulator'; render(<App/>); fireEvent.click(screen.getByRole('button', { name: 'Start workflow' }));
  switchTo('Technical'); expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('playing');
  await act(async () => { window.location.hash = '#/assurance'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect((screen.getByRole('radio', { name: 'Technical' }) as HTMLInputElement).checked).toBe(true);
  await act(async () => { window.location.hash = '#/simulator'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('paused');
  expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('0 transitions');
  switchTo('Executive');
  await act(async () => { window.location.hash = '#/overview'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect((screen.getByRole('radio', { name: 'Executive' }) as HTMLInputElement).checked).toBe(true);
  expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
});
it('preserves pending walkthrough restart and cancellation through both audience directions', async () => {
  window.location.hash = '#/governance'; render(<App/>); fireEvent.click(screen.getByRole('button', { name: 'Evaluate simulated request' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guided walkthrough →' }));
  const decision = document.querySelector('.event')!.textContent;
  for (const audience of ['Technical', 'Executive'] as const) { switchTo(audience); expect(screen.getByRole('region', { name: 'Walkthrough reset consequence' })).toBeTruthy(); expect(document.querySelector('.event')!.textContent).toBe(decision); }
  fireEvent.click(screen.getByRole('button', { name: 'Keep current policy run' })); expect(screen.queryByRole('region', { name: 'Walkthrough reset consequence' })).toBeNull(); expect(document.querySelector('.event')!.textContent).toBe(decision);
  fireEvent.click(screen.getByRole('button', { name: 'Guided walkthrough →' })); switchTo('Technical');
  fireEvent.click(screen.getByRole('button', { name: 'Start walkthrough and clear policy run' }));
  await act(async () => window.dispatchEvent(new HashChangeEvent('hashchange')));
  const guide = screen.getByRole('region', { name: 'Guided walkthrough' }); expect(guide.textContent).toContain('1 OF 5');
  switchTo('Executive'); expect(guide.textContent).toContain('1 OF 5'); switchTo('Technical'); expect(guide.textContent).toContain('1 OF 5');
  expect(screen.getByRole('region', { name: 'Shared simulated run' }).textContent).toContain('mode C · seed 42 · logical tick 0');
});
it('retains finding filters and frozen trial replay on audience changes', async () => {
  window.location.hash = '#/hazop'; render(<App/>); switchTo('Technical');
  fireEvent.change(screen.getByLabelText('Agent node'), { target: { value: 'supplier' } });
  const selected = document.querySelector('.selected-row')?.textContent;
  switchTo('Executive'); expect((screen.getByLabelText('Agent node') as HTMLSelectElement).value).toBe('supplier');
  switchTo('Technical'); expect(document.querySelector('.selected-row')?.textContent).toBe(selected);
  await act(async () => { window.location.hash = '#/assurance?trial=12'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  fireEvent.change(screen.getByLabelText('Filter recorded arm'), { target: { value: 'C' } });
  fireEvent.click(screen.getByRole('button', { name: 'Replay next recorded call' }));
  for (const audience of ['Executive', 'Technical'] as const) { switchTo(audience); expect((screen.getByLabelText('Filter recorded arm') as HTMLSelectElement).value).toBe('C'); expect(document.querySelectorAll('.replay-list li')).toHaveLength(1); }
});
// App owns the policy interval; Stage owns the workflow interval. These are real
// timers/reducers, tested separately AND together around each due boundary.
for (const running of ['policy', 'workflow', 'both'] as const) for (const instant of [699, 700, 701, 899, 900, 901]) {
  it(`${running} timers: audience changes at ${instant}ms neither duplicate nor lose commands`, () => {
    vi.useFakeTimers(); const workflowCalls = vi.spyOn(workflowAPI, 'workflowReducer'); const policyCalls = vi.spyOn(policyAPI, 'reducer'); window.location.hash = '#/simulator'; render(<App/>);
    fireEvent.click(document.querySelector('details.legacy-policy > summary')!);
    const legacy = within(document.querySelector('details.legacy-policy')! as HTMLElement);
    if (running !== 'workflow') fireEvent.click(legacy.getByRole('button', { name: 'Start' }));
    if (running !== 'policy') fireEvent.click(screen.getByRole('button', { name: 'Start workflow' }));
    act(() => vi.advanceTimersByTime(instant));
    const policyBefore = legacy.getByRole('status', { name: 'Policy illustration status' }).textContent;
    const workflowBefore = screen.getByRole('status', { name: 'Workflow status' }).textContent;
    const workflowCommands = workflowCalls.mock.calls.map(([, command]) => command); const policyCommands = policyCalls.mock.calls.map(([, command]) => command);
    switchTo('Technical'); expect(legacy.getByRole('status', { name: 'Policy illustration status' }).textContent).toBe(policyBefore); expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toBe(workflowBefore);
    switchTo('Executive'); expect(legacy.getByRole('status', { name: 'Policy illustration status' }).textContent).toBe(policyBefore); expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toBe(workflowBefore);
    expect(workflowCalls.mock.calls.map(([, command]) => command)).toEqual(workflowCommands); expect(policyCalls.mock.calls.map(([, command]) => command)).toEqual(policyCommands);
    act(() => vi.advanceTimersByTime(1800 - instant));
    expect(workflowCalls.mock.calls.filter(([, command]) => command.type === 'timer')).toHaveLength(running === 'policy' ? 0 : 2);
    expect(policyCalls.mock.calls.filter(([, command]) => command.type === 'timer')).toHaveLength(running === 'workflow' ? 0 : 2);
    expect(legacy.getByRole('status', { name: 'Policy illustration status' }).textContent).toContain(`tick ${running === 'workflow' ? 0 : 2}`);
    expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain(`${running === 'policy' ? 0 : 2} transitions`);
  });
}
