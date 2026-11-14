// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PurchasingOperations } from './PurchasingOperations.tsx';
import { HazopConversation } from './HazopConversation.tsx';
import { AudienceProvider } from './AudienceView.tsx';
import { Hazop } from '../routes/Hazop.tsx';
import { hazards } from '../data.ts';
import { findingExercise, workflowStudies } from '../domain/reviewMappings.ts';
import { createWorkflow, exportWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from '../workflow/index.ts';
import type { ScenarioId } from '../workflow/index.ts';

afterEach(() => { cleanup(); window.history.replaceState(null, '', '#/hazop'); });
function finished(scenario: ScenarioId) {
  let state = createWorkflow(scenarioSpec(scenario));
  for (let count = 0; count < 100 && selectWorkflow(state).controls.canStep; count++) state = workflowReducer(state, { type: 'step' });
  return state;
}
it.each(['nominal', 'approval-delay', 'purchase-race', 'lost-purchase-response'] as const)('reviews %s without switching its question or executing work', scenario => {
  const state = finished(scenario); const before = exportWorkflow(state); const inspect = vi.fn();
  render(<PurchasingOperations state={state} issue="analytical" onInspect={inspect}/>);
  fireEvent.click(screen.getByRole('button', { name: 'Review operation design' }));
  const review = screen.getByRole('region', { name: 'HAZOP design review' });
  expect(within(review).getByRole('heading', { name: workflowStudies[scenario].title })).toBeTruthy();
  expect(review.textContent).toContain(workflowStudies[scenario].summary);
  if (scenario !== 'approval-delay') {
    expect(within(review).queryByText('Related timing finding—different object/coverage')).toBeNull();
    expect(within(review).queryByText(/separate timing study/i)).toBeNull();
  }
  for (let step = 0; step < 4; step++) fireEvent.click(within(review).getByRole('button', { name: 'Next review question' }));
  expect(review.textContent).toContain('Residual risk, severity, likelihood and business benefit are unknown');
  expect(exportWorkflow(state)).toBe(before); expect(inspect).not.toHaveBeenCalled();
});
it('preserves explicit source selection as a separate timing study rather than changing the active case', () => {
  const state = finished('lost-purchase-response'); const before = exportWorkflow(state);
  render(<HazopConversation state={state} hazardId="APS-f47191931b96a999a61c"/>);
  expect(screen.getByRole('heading', { name: 'Can commitment occur after permission expires?' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Separate selected record context' }).textContent).toContain('explicitly selected source');
  expect(screen.getByText('Related timing finding—different object/coverage')).toBeTruthy();
  expect(exportWorkflow(state)).toBe(before);
});
it('does not manufacture an exercise for a finding without a mapping', () => {
  const unmapped = hazards.find(h => findingExercise(h.id).coverage === 'unmapped')!;
  render(<Hazop params={new URLSearchParams({ hazard: unmapped.id })}/>);
  const mapping = screen.getByRole('region', { name: 'Finding exercise mapping' });
  expect(mapping.textContent).toContain('No runnable request illustration');
  expect(within(mapping).queryByRole('link')).toBeNull();
});
it('links an approval finding to its applicable request and retains source identity', () => {
  const id = 'APS-11dc498eedac1dc719df';
  render(<Hazop params={new URLSearchParams({ hazard: id })}/>);
  const link = screen.getByRole('link', { name: 'Missing approval request →' });
  expect(link.getAttribute('href')).toBe(`#/governance?story=approval&hazard=${id}`);
  expect(screen.queryByRole('link', { name: /Unauthorized supplier request/ })).toBeNull();
});
it('updates selection with filters and explicitly labels retained detail when results are empty', () => {
  render(<Hazop params={new URLSearchParams()}/>);
  fireEvent.change(screen.getByLabelText('Agent node'), { target: { value: 'supplier' } });
  expect(screen.getByRole('heading', { name: /\/ supplier$/ })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: /\/ orchestrator$/ })).toBeNull();
  fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'no-matching-finding' } });
  expect(screen.getByRole('status').textContent).toContain('Pinned finding outside the current filter: supplier');
  expect(screen.getByText(/No findings match/)).toBeTruthy();
});
it('focuses the selected detail and restores row focus without losing shareable filters', () => {
  const initial = new URLSearchParams({ node: 'supplier', deviation: 'AUTHORITY_ESCALATION', search: 'supplier', sort: 'node' });
  render(<Hazop params={initial}/>);
  const row = within(screen.getByRole('table')).getByRole('button');
  fireEvent.click(row);
  const detail = screen.getByRole('heading', { name: 'AUTHORITY ESCALATION / supplier' });
  expect(document.activeElement).toBe(detail);
  const href = screen.getByRole('link', { name: 'Link to this finding and filters' }).getAttribute('href')!;
  const query = new URLSearchParams(href.split('?')[1]);
  expect(query.get('node')).toBe('supplier'); expect(query.get('deviation')).toBe('AUTHORITY_ESCALATION');
  expect(query.get('search')).toBe('supplier'); expect(query.get('sort')).toBe('node'); expect(query.get('hazard')).toBe('APS-ad4a560c0e8ea4fa1023');
  fireEvent.click(screen.getByRole('button', { name: 'Return to selected finding in register' })); expect(document.activeElement).toBe(row);
  cleanup(); render(<Hazop params={query}/>);
  expect((screen.getByLabelText('Search findings') as HTMLInputElement).value).toBe('supplier');
  expect(screen.getByRole('heading', { name: 'AUTHORITY ESCALATION / supplier' })).toBeTruthy();
  expect(within(screen.getByRole('table')).getByRole('button').getAttribute('aria-pressed')).toBe('true');
});
it('keeps the executive title and review aligned after a technical selection changes a timing deep link', () => {
  render(<AudienceProvider><Hazop params={new URLSearchParams({ hazard: 'APS-f47191931b96a999a61c' })}/></AudienceProvider>);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('What could go wrong between permission and purchase?');
  fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
  fireEvent.change(screen.getByLabelText('Agent node'), { target: { value: 'supplier' } });
  const row = within(screen.getByRole('table')).getAllByRole('button')[0]; fireEvent.click(row);
  const chosen = new URLSearchParams(window.location.hash.split('?')[1]).get('hazard');
  fireEvent.click(screen.getByRole('radio', { name: 'Executive' }));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('What can depart from intended purchasing?');
  expect(screen.getByRole('region', { name: 'HAZOP design review' }).textContent).toContain(chosen);
  expect(screen.queryByRole('heading', { name: 'Can commitment occur after permission expires?' })).toBeNull();
});
it.each(['selection', 'filter'])('clears an initial invalid-link notice after explicit %s', action => {
  render(<AudienceProvider><Hazop params={new URLSearchParams({ hazard: 'missing-finding' })}/></AudienceProvider>);
  expect(screen.getByText(/Requested finding unavailable; showing the current source fallback/)).toBeTruthy();
  fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
  if (action === 'selection') fireEvent.click(within(screen.getByRole('table')).getAllByRole('button')[0]);
  else fireEvent.change(screen.getByLabelText('Agent node'), { target: { value: 'supplier' } });
  fireEvent.click(screen.getByRole('radio', { name: 'Executive' }));
  expect(screen.queryByText(/Requested finding unavailable; showing the current source fallback/)).toBeNull();
  expect(screen.getByRole('region', { name: 'HAZOP design review' }).textContent).toContain('Selected source finding');
});
