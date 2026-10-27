// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BusinessExercise, BusinessOverview, BusinessRoles, BusinessScenarioNote } from './BusinessContext.tsx';
import { WorkflowStage } from './WorkflowStage.tsx';
import { createWorkflow, exportWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from '../workflow/index.ts';
import type { Mode, ScenarioId, WorkflowCommand, WorkflowState } from '../workflow/index.ts';

afterEach(cleanup);
function populated() {
  let state = createWorkflow(scenarioSpec());
  for (let i = 0; i < 100 && !selectWorkflow(state).metrics.committedOrders; i++) state = workflowReducer(state, { type: 'step' });
  expect(selectWorkflow(state).metrics.committedOrders).toBe(1);
  expect(state.running).toBe(false);
  return state;
}
function finished(scenario: ScenarioId, mode: Mode) {
  let state = createWorkflow(scenarioSpec(scenario, mode));
  for (let i = 0; i < 100 && selectWorkflow(state).controls.canStep; i++) state = workflowReducer(state, { type: 'step' });
  return state;
}
function Stage({ state, command = () => {} }: { state: WorkflowState; command?: (command: WorkflowCommand) => void }) {
  return <WorkflowStage state={state} onCommand={command} onExport={() => exportWorkflow(state)} onImport={() => ({ ok: false, message: 'Not used in explanation checks' })}/>;
}
function stat(label: string) {
  return screen.getByText(label, { exact: true }).closest('.stat')!.querySelector('strong')!.textContent;
}

describe('business explanation without new workflow authority', () => {
  it('links the business exercise to the existing simulator and keeps the research boundary visible', () => {
    render(<BusinessOverview/>);
    expect(screen.getByRole('link', { name: 'Try the factory-supply exercise →' }).getAttribute('href')).toBe('#/simulator');
    expect(screen.getByText(/Agents, approvals, orders and spending are simulated/)).toBeTruthy();
    expect(screen.getByText(/An order does not mean goods arrived/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('opens every explanation without changing a populated paused run or its controls', () => {
    const state = populated(); const command = vi.fn(); const before = exportWorkflow(state);
    const { container } = render(<Stage state={state} command={command}/>);
    const controls = () => Array.from(container.querySelectorAll('button,select')).map(element => ({ tag: element.tagName, text: element.textContent, disabled: (element as HTMLButtonElement).disabled, value: (element as HTMLSelectElement).value }));
    const beforeControls = controls(); const status = screen.getByRole('status', { name: 'Workflow status' }).textContent;
    const details = container.querySelectorAll<HTMLDetailsElement>('.business-context details');
    expect(details.length).toBeGreaterThan(0);
    for (const detail of details) {
      const summary = detail.querySelector('summary')!;
      summary.focus(); fireEvent.click(summary); expect(detail.open).toBe(true);
      expect(document.activeElement).toBe(summary);
      expect(exportWorkflow(state)).toBe(before); expect(controls()).toEqual(beforeControls);
      fireEvent.click(summary); expect(detail.open).toBe(false);
    }
    expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toBe(status);
    expect(command).not.toHaveBeenCalled(); expect(exportWorkflow(state)).toBe(before);
    expect(stat('Committed orders')).toBe('1'); expect(stat('Simulated spend')).toBe('400');
  });
  it('keeps business stakes tied to the applied run rather than a draft scenario', () => {
    function Harness() {
      const [state, setState] = useState(() => createWorkflow(scenarioSpec()));
      return <WorkflowStage state={state} onCommand={command => setState(current => workflowReducer(current, command))} onExport={() => exportWorkflow(state)} onImport={() => ({ ok: false, message: 'Not used' })}/>;
    }
    render(<Harness/>);
    const situation = () => within(screen.getByLabelText('Active business situation'));
    expect(situation().getByRole('heading', { name: 'The ordinary purchase' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Workflow scenario'), { target: { value: 'lost-purchase-response' } });
    expect(situation().getByRole('heading', { name: 'The ordinary purchase' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Apply selection and start new run' }));
    expect(situation().getByRole('heading', { name: 'No reply does not mean no order' })).toBeTruthy();
    expect(stat('Committed orders')).toBe('0');
  });
  it('shows non-default task inputs without pretending the built-in example is their observed result', () => {
    const task = { ...scenarioSpec().task, demand: 17, stock: 2, unitPrice: 9, budget: 8000 };
    const { container } = render(<BusinessExercise task={task}/>);
    const current = container.querySelector('.business-current-inputs')!.textContent;
    expect(current).toContain('demand 17, stock 2, unit price 9, budget 8000');
    expect(current).not.toContain('80-unit'); expect(current).not.toContain('400');
    expect(screen.getByText(/These are model defaults, not measured savings or a result already achieved/)).toBeTruthy();
    expect(screen.getByText(/Suggested discussion time: 10–15 minutes, not a measured/)).toBeTruthy();
  });
  it('explains all six roles without creating action controls', () => {
    const { container } = render(<BusinessRoles/>);
    expect(Array.from(container.querySelectorAll('.business-role-grid dt'), node => node.textContent)).toEqual(['Demand', 'Inventory', 'Supplier', 'Finance', 'Purchase', 'Orchestrator']);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(/Coordination does not make inputs true/)).toBeTruthy();
  });
  it.each([
    ['nominal', 'The ordinary purchase'], ['approval-delay', 'Permission expires while work continues'],
    ['purchase-race', 'One need, competing proposals'], ['lost-purchase-response', 'No reply does not mean no order'],
  ] as const)('explains the existing %s situation without scenario commands', (scenario, title) => {
    render(<BusinessScenarioNote scenario={scenario}/>);
    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull(); expect(screen.queryByRole('button')).toBeNull();
  });
  it('retains unsafe effects and the safe-completion distinction when baseline work confirms', () => {
    const state = finished('approval-delay', 'A');
    expect(selectWorkflow(state).metrics.completed).toBe(true);
    expect(selectWorkflow(state).metrics.unsafeCommittedEffects).toBeGreaterThan(0);
    render(<Stage state={state}/>);
    expect(stat('Task confirmed')).toBe('Yes'); expect(stat('Safe model completion')).toBe('No');
    expect(Number(stat('Unsafe committed effects'))).toBeGreaterThan(0);
    expect(screen.getByText(/Confirmation alone is not an acceptable-outcome decision/)).toBeTruthy();
    expect(screen.getByLabelText('Observed simulated effects')).toBeTruthy();
  });
  it.each(['A', 'B', 'C'] as const)('qualifies expiry denial and refresh guidance against actual %s outcomes', mode => {
    const state = finished('approval-delay', mode);
    const view = selectWorkflow(state);
    const before = exportWorkflow(state); const command = vi.fn();
    render(<Stage state={state} command={command}/>);
    const note = screen.getByLabelText('Active business situation');
    const primary = Array.from(note.children).filter(node => node.tagName === 'P').map(node => node.textContent).join(' ');
    const expiryEntry = within(note).getByText('Permission expires while work continues', { selector: 'dt' }).nextElementSibling!;
    for (const text of [primary, expiryEntry.textContent!]) {
      expect(text).toContain('In C, the defended comparator');
      expect(text).toContain('before requesting one fresh simulated approval');
      expect(text).toContain('A/B may confirm work despite expired approval, without an expiry denial or a refresh control');
      expect(text).toContain('Compare Task confirmed with Unsafe committed effects and Safe model completion');
      expect(text).toContain('recovery keeps the original problem in the history');
    }
    if (mode === 'C') {
      expect(view.metrics.completed).toBe(false);
      expect(view.metrics.deniedProposals).toBeGreaterThan(0);
      expect(view.metrics.committedOrders).toBe(0);
      expect(view.controls.canRecover).toBe(true);
      expect(screen.getByRole('button', { name: 'Request one approval refresh' })).toBeTruthy();
      expect(stat('Task confirmed')).toBe('No');
    } else {
      expect(view.metrics.completed).toBe(true);
      expect(view.metrics.deniedProposals).toBe(0);
      expect(view.metrics.unsafeCommittedEffects).toBeGreaterThan(0);
      expect(view.controls.canRecover).toBe(false);
      expect(screen.queryByRole('button', { name: 'Request one approval refresh' })).toBeNull();
      expect(stat('Task confirmed')).toBe('Yes');
    }
    expect(stat('Safe model completion')).toBe('No');
    expect(exportWorkflow(state)).toBe(before); expect(command).not.toHaveBeenCalled();
  });
  it('preserves one route heading, unique workflow status and reachable technical evidence', () => {
    const { container } = render(<Stage state={populated()}/>);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('status', { name: 'Workflow status' })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Typed handoffs' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Model observations and limits' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Prepare current replay JSON' })).toBeTruthy();
    const names = Array.from(container.querySelectorAll('.business-context summary'), summary => summary.textContent);
    expect(new Set(names).size).toBe(names.length);
  });
});
