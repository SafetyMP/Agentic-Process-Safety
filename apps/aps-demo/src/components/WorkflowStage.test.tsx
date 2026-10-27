// @vitest-environment jsdom
import { Profiler, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { WorkflowStage } from './WorkflowStage.tsx';
import { createWorkflow, exportWorkflow, importWorkflow, scenarioSpec, workflowReducer } from '../workflow/index.ts';
import type { Mode, ScenarioId } from '../workflow/index.ts';
import { App } from '../App.tsx';
import { Governance } from '../routes/Governance.tsx';
import { Simulator } from '../routes/Simulator.tsx';
import { initialState, reducer } from '../domain/simulation.ts';

const diagnosticCase = 'shows the race loser without erasing the C winner and exposes A duplicate effects';
let diagnosticActive = false;
let diagnosticEmitted = false;
let diagnosticStart = 0;
let diagnosticWall = 0;
const diagnosticRecords: unknown[][] = [];
let diagnosticPhase = '';
let diagnosticObserverMs = 0;
function diagnosticRecord(kind: string, ...values: (number | string | boolean)[]) {
  if (!diagnosticActive) return;
  const start = performance.now();
  if (diagnosticRecords.length < 512) diagnosticRecords.push([kind, diagnosticPhase, ...values]);
  diagnosticObserverMs += performance.now() - start;
}
beforeEach(({ task }) => {
  diagnosticActive = task.name === diagnosticCase;
  diagnosticEmitted = false;
  diagnosticRecords.length = 0;
  diagnosticPhase = '';
  diagnosticObserverMs = 0;
  if (diagnosticActive) {
    diagnosticStart = performance.now();
    diagnosticWall = Date.now();
  }
});
function Harness({ scenario = 'nominal', mode = 'C' }: { scenario?: ScenarioId; mode?: Mode }) {
  const [state, setState] = useState(() => createWorkflow(scenarioSpec(scenario, mode)));
  if (diagnosticActive) diagnosticPhase = state.spec.mode;
  const stage = <WorkflowStage state={state} onCommand={command => setState(current => {
    if (!diagnosticActive) return workflowReducer(current, command);
    const start = performance.now();
    const next = workflowReducer(current, command);
    diagnosticRecord('reducer', command.type, performance.now() - start, next.events.length);
    return next;
  })} onExport={() => exportWorkflow(state)} onImport={text => {
    const result = importWorkflow(text);
    if (!result.ok) return { ok: false, message: result.message };
    setState(result.state); return { ok: true, message: 'Replay imported' };
  }}/>;
  return diagnosticActive ? <Profiler id="workflow" onRender={(_id, phase, actualDuration, baseDuration) => diagnosticRecord('render', phase, actualDuration, baseDuration)}>{stage}</Profiler> : stage;
}
function stepToBoundary() {
  for (let step = 0; step < 100; step++) {
    const lookupStart = diagnosticActive ? performance.now() : 0;
    const button = screen.getByRole('button', { name: 'Step one transition' }) as HTMLButtonElement;
    if (diagnosticActive) diagnosticRecord('lookup', step, performance.now() - lookupStart);
    if (button.disabled) { diagnosticRecord('boundary', step); return; }
    const clickStart = diagnosticActive ? performance.now() : 0;
    fireEvent.click(button);
    if (diagnosticActive) diagnosticRecord('click', step, performance.now() - clickStart);
  }
  throw new Error('No workflow boundary reached in 100 UI steps');
}
function stat(name: string) {
  return screen.getByText(name, { exact: true }).closest('.stat')!.querySelector('strong')!.textContent;
}
afterEach(() => {
  if (diagnosticActive && !diagnosticEmitted) {
    diagnosticRecord('finish', performance.now() - diagnosticStart, Date.now() - diagnosticWall, document.querySelectorAll('*').length);
    diagnosticEmitted = true;
    diagnosticActive = false;
    console.log('CI_WF01_DIAGNOSTIC ' + JSON.stringify({ caseName: diagnosticCase, records: diagnosticRecords, observerMs: diagnosticObserverMs }));
  }
  cleanup(); vi.useRealTimers(); window.location.hash = '';
});

describe('workflow presentation with actual engine transitions', () => {
  it('shows six roles and differentiates delivered from consumed messages', () => {
    render(<Harness/>);
    expect(document.querySelectorAll('.workflow-agent')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
    expect(within(screen.getByRole('table', { name: 'Generated messages in the active browser run' })).getByText('delivered')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
    expect(within(screen.getByRole('table')).getAllByText('consumed').length).toBeGreaterThan(0);
    expect(stat('Task confirmed')).toBe('No');
    expect(stat('Committed orders')).toBe('0');
  });
  it('derives a nominal order and lets a keyboard-focusable event expose its causes', () => {
    render(<Harness/>); stepToBoundary();
    expect(stat('Committed orders')).toBe('1'); expect(stat('Simulated spend')).toBe('400'); expect(stat('Task confirmed')).toBe('Yes');
    expect(stat('Safe model completion')).toBe('Yes');
    const eventButtons = document.querySelectorAll<HTMLButtonElement>('.workflow-timeline button');
    fireEvent.click(eventButtons[eventButtons.length - 1]);
    const inspector = screen.getByRole('region', { name: 'Causal event inspector' });
    expect(within(inspector).getByText('Direct causes')).toBeTruthy();
    expect(document.activeElement).toBe(within(inspector).getByRole('heading', { name: 'Event inspector' }));
  });
  it('recovers an expired approval without erasing its block or inventing an order', () => {
    render(<Harness scenario="approval-delay"/>); stepToBoundary();
    expect(stat('Committed orders')).toBe('0'); expect(stat('Task confirmed')).toBe('No');
    const before = document.querySelectorAll('.workflow-timeline li').length;
    expect(screen.getByRole('region', { name: 'Approval refresh decision' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Request one approval refresh' })); stepToBoundary();
    expect(stat('Committed orders')).toBe('1'); expect(stat('Simulated spend')).toBe('400'); expect(stat('Task confirmed')).toBe('Yes');
    expect(document.querySelectorAll('.workflow-timeline li').length).toBeGreaterThan(before);
    expect(screen.queryByRole('button', { name: 'Request one approval refresh' })).toBeNull();
  });
  it('shows the race loser without erasing the C winner and exposes A duplicate effects', () => {
    const view = render(<Harness scenario="purchase-race"/>); stepToBoundary();
    expect(stat('Committed orders')).toBe('1'); expect(stat('Task confirmed')).toBe('Yes');
    expect(screen.getByText(/^Simulated interleaving ·/)).toBeTruthy();
    view.unmount(); render(<Harness scenario="purchase-race" mode="A"/>); stepToBoundary();
    expect(stat('Committed orders')).toBe('2'); expect(stat('Simulated spend')).toBe('800');
    expect(Number(stat('Unsafe committed effects'))).toBeGreaterThan(0);
    expect(stat('Task confirmed')).toBe('Yes'); expect(stat('Safe model completion')).toBe('No');
    expect(screen.getByText(/Business confirmation alone does not imply/)).toBeTruthy();
  });
  it('reconciles a lost response without creating a second committed effect', () => {
    render(<Harness scenario="lost-purchase-response"/>); stepToBoundary();
    expect(stat('Committed orders')).toBe('1'); expect(stat('Task confirmed')).toBe('No');
    expect(screen.getByRole('region', { name: 'Unknown outcome decision' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reconcile existing order once' })); stepToBoundary();
    expect(stat('Committed orders')).toBe('1'); expect(stat('Simulated spend')).toBe('400'); expect(stat('Task confirmed')).toBe('Yes');
  });
  it('keeps draft selections separate, explicitly replaces history, and preserves run on invalid import', () => {
    render(<Harness/>); stepToBoundary();
    fireEvent.change(screen.getByLabelText('Workflow scenario'), { target: { value: 'approval-delay' } });
    expect(stat('Committed orders')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'Apply selection and start new run' }));
    expect(stat('Committed orders')).toBe('0'); expect(stat('Task confirmed')).toBe('No');
    fireEvent.change(screen.getByLabelText('Replay JSON to validate'), { target: { value: '{"simulationOnly":false}' } });
    const count = document.querySelectorAll('.workflow-timeline li').length;
    fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
    expect(document.querySelectorAll('.workflow-timeline li')).toHaveLength(count);
    expect(stat('Committed orders')).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Prepare current replay JSON' }));
    const exported = JSON.parse((screen.getByLabelText('Prepared replay snapshot') as HTMLTextAreaElement).value);
    expect(exported.simulationOnly).toBe(true);
  });
  it('keeps paused playback stationary and cleans the timer on unmount', () => {
    vi.useFakeTimers(); const view = render(<Harness/>);
    fireEvent.click(screen.getByRole('button', { name: 'Start workflow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause workflow' }));
    const count = document.querySelectorAll('.workflow-timeline li').length;
    act(() => vi.advanceTimersByTime(10000));
    expect(document.querySelectorAll('.workflow-timeline li')).toHaveLength(count);
    fireEvent.click(screen.getByRole('button', { name: 'Start workflow' })); view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('policy illustration honesty', () => {
  it('describes the effective override and stops labeling an evaluated fault queued', () => {
    let state = reducer(initialState(42, 'C', 'normal'), { type: 'inject', story: 'context' });
    for (let i = 0; i < 3; i++) state = reducer(state, { type: 'step' });
    const view = render(<Simulator state={state} dispatch={() => {}}/>);
    expect(screen.getByText('Evaluated override: Compromised shared context')).toBeTruthy();
    expect(screen.queryByText(/^Queued/)).toBeNull();
    view.unmount(); render(<Governance state={state} dispatch={() => {}}/>);
    expect(screen.getByText('Trust substituted context from another task')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'CTL-CONTEXT' })).toBeTruthy();
  });
  it('shows pending request context and approval consequence', () => {
    let state = initialState(42, 'C', 'conflict');
    for (let i = 0; i < 3; i++) state = reducer(state, { type: 'step' });
    render(<Governance state={state} dispatch={() => {}}/>);
    const brief = screen.getByRole('region', { name: 'Simulated review decision' });
    expect(within(brief).getByText('purchase')).toBeTruthy();
    expect(within(brief).getByText(/Approve records this request as executed/)).toBeTruthy();
  });
  it('does not claim an unevaluated walkthrough result or silently clear a previous run', async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.location.hash = '#/governance'; render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate simulated request' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guided walkthrough →' }));
    expect(screen.getByRole('region', { name: 'Walkthrough reset consequence' })).toBeTruthy();
    expect(screen.getByText('DENY · SIMULATED')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start walkthrough and clear policy run' }));
    await act(async () => window.dispatchEvent(new HashChangeEvent('hashchange')));
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await act(async () => window.dispatchEvent(new HashChangeEvent('hashchange')));
    }
    expect(screen.getByText('No SIMULATED outcome yet')).toBeTruthy();
    expect(screen.getByText(/You advanced without evaluating/)).toBeTruthy();
    expect(screen.queryByText('DENY · SIMULATED')).toBeNull();
  });
  it('preserves the same workflow across routes and labels business and safe completion separately', async () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.location.hash = '#/simulator'; render(<App/>);
    stepToBoundary(); expect(stat('Committed orders')).toBe('1');
    await act(async () => { window.location.hash = '#/assurance'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    const summary = screen.getByRole('region', { name: 'Current workflow run' });
    expect(within(summary).getByText(/business confirmation: confirmed · safe model completion: yes · unsafe effects 0/)).toBeTruthy();
    expect(screen.getAllByText('0/8').length).toBeGreaterThan(0);
    await act(async () => { window.location.hash = '#/simulator'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
    expect(stat('Committed orders')).toBe('1'); expect(stat('Safe model completion')).toBe('Yes');
  });

});
