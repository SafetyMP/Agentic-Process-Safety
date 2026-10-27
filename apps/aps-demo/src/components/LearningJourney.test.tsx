// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { compareWorkflow, WorkflowComparison, LeadershipBrief, ExecutivePrimer } from './LearningJourney.tsx';
import { EventContext } from './TechnicalGuide.tsx';
import { createWorkflow, scenarioSpec, exportWorkflow, selectWorkflow } from '../workflow/index.ts';
afterEach(cleanup);
it('compares expiry with the same inputs without recovering, overwriting or mutating the active run', () => {
  const state = createWorkflow(scenarioSpec('approval-delay'));
  const before = exportWorkflow(state);
  render(<WorkflowComparison state={state}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Run matched comparison' }));
  const rows = within(screen.getByRole('table')).getAllByRole('row');
  expect(rows).toHaveLength(4);
  expect(rows[1].textContent).toContain('1 / 400');
  expect(rows[3].textContent).toContain('0 / 0');
  expect(rows[3].textContent).toContain('Fresh approval needed');
  expect(exportWorkflow(state)).toBe(before);
  const runs = compareWorkflow(state.spec);
  expect(runs.map(r => r.spec.task)).toEqual([state.spec.task, state.spec.task, state.spec.task]);
  expect(runs.map(r => r.journal.length)).toEqual([0,0,0]);
  expect(runs[2].world.approvals).toHaveLength(1);
});
it('identifies a previous comparison after setup changes instead of relabeling its results', () => {
  const h = render(<WorkflowComparison state={createWorkflow(scenarioSpec('purchase-race'))}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Run matched comparison' }));
  h.rerender(<WorkflowComparison state={createWorkflow(scenarioSpec('nominal'))}/>);
  expect(screen.getByRole('status').textContent).toContain('previous comparison results');
  expect(screen.getByText(/Competing purchase proposals ·/)).toBeTruthy();
});
it('retains a committed order with unknown confirmation when the reply is lost', () => {
  const runs = compareWorkflow(scenarioSpec('lost-purchase-response'));
  for (const state of runs) {
    expect(state.world.orders).toHaveLength(1);
    expect(selectWorkflow(state).metrics.completed).toBe(false);
    expect(state.status).toBe('outcome-unknown');
  }
  render(<LeadershipBrief state={runs[2]}/>);
  expect(screen.getByText(/configuration C · 1 orders · 400 simulated units · confirmation not established/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Proposed accountable role'), { target: { value: 'Procurement owner' } });
  expect(screen.getByText(/No person is assigned or approval issued/)).toBeTruthy();
});
it('links an actual committed effect to its message and current invariant observations', () => {
  const state = compareWorkflow(scenarioSpec('nominal'))[2];
  const event = state.events.find(e => e.type === 'order-committed')!;
  render(<EventContext state={state} event={event}/>);
  expect(screen.getByText(/Linked order order-1: quantity 80, amount 400/)).toBeTruthy();
  expect(screen.getByText(/approval-freshness: pass/)).toBeTruthy();
  expect(screen.getByText(/Full historical world snapshots are not stored/)).toBeTruthy();
});
it('teaches the distinction between analysis and a runtime stop without commanding the model', () => {
  render(<ExecutivePrimer/>);
  fireEvent.click(screen.getByRole('button', { name: 'Control the commitment' }));
  expect(screen.getByText(/modeled control can stop an expired approval/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Control the commitment' }).getAttribute('aria-current')).toBe('step');
});
