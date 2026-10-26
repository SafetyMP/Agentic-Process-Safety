// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { PurchasingOperations } from './PurchasingOperations.tsx';
import { HazopConversation } from './HazopConversation.tsx';
import { AudienceProvider } from './AudienceView.tsx';
import { CaseBrief } from './ExecutiveCase.tsx';
import { App } from '../App.tsx';
import { createWorkflow, exportWorkflow, importWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from '../workflow/index.ts';
import type { Mode, ScenarioId, WorkflowState } from '../workflow/index.ts';
import { digest } from '../workflow/scenarios.ts';
afterEach(() => { cleanup(); window.location.hash = ''; });
function finish(scenario: ScenarioId, mode: Mode = 'C') { let s = createWorkflow(scenarioSpec(scenario, mode)); for (let i = 0; i < 100 && selectWorkflow(s).controls.canStep; i++) s = workflowReducer(s, { type: 'step' }); return s; }
function tab(name: string) { fireEvent.click(screen.getByRole('tab', { name })); }
function desk(state: WorkflowState) { const inspect = vi.fn(); const review = vi.fn(); const rendered = render(<AudienceProvider><PurchasingOperations state={state} onInspect={inspect} onReview={review}/></AudienceProvider>); return { inspect, review, ...rendered }; }
it('opens actual supplied task and empty records without deriving work or issuing a command', () => {
  const s = createWorkflow(scenarioSpec()); const before = exportWorkflow(s); const h = desk(s);
  fireEvent.click(screen.getByRole('button', { name: `Open task ${s.spec.task.id}` })); expect(screen.getByRole('region', { name: 'Selected purchasing record' }).textContent).toContain(s.spec.task.id);
  tab('Analytical'); expect(screen.getByText('No quote prepared yet.')).toBeTruthy(); expect(screen.getByText(/Shortage: not derived yet/)).toBeTruthy();
  tab('Analytical'); expect(screen.getByText('No simulated permission issued.')).toBeTruthy(); tab('Pitch'); expect(screen.getByText('No order recorded.')).toBeTruthy();
  tab('Analytical'); expect(screen.getByText(/No exception event recorded/)).toBeTruthy(); expect(exportWorkflow(s)).toBe(before); expect(h.inspect).not.toHaveBeenCalled(); expect(h.review).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /create|submit|approve|assign|pay|ship|override|retry/i })).toBeNull();
});
it('uses real imported identities and values instead of hardcoded default business records', () => {
  const spec = scenarioSpec(); spec.task = { ...spec.task, id: 'request-27', contextId: 'context-27', demand: 37, stock: 7, unitPrice: 9, budget: 500 }; spec.fixtureDigest = digest(spec.task);
  let state = createWorkflow(spec); for (let i = 0; i < 100 && selectWorkflow(state).controls.canStep; i++) state = workflowReducer(state, { type: 'step' });
  const imported = importWorkflow(exportWorkflow(state)); expect(imported.ok).toBe(true); if (!imported.ok) throw new Error('Expected supported custom replay');
  desk(imported.state); fireEvent.click(screen.getByRole('button', { name: 'Open task request-27' })); tab('Analytical');
  expect(screen.getByText(/Observed stock 7. Shortage: 30/)).toBeTruthy(); expect(screen.getByText(/30 units × 9 = 270 simulated units/)).toBeTruthy();
  tab('Pitch'); expect(screen.getByText(/30 units · 270 simulated units/)).toBeTruthy(); expect(screen.queryByText(/80 units/)).toBeNull();
});
it('tabs use native focus semantics and preserve selected record through view changes', () => {
  const state = finish('nominal'); const before = exportWorkflow(state); desk(state); const first = screen.getByRole('tab', { name: 'Conceptual' }); first.focus(); fireEvent.keyDown(first, { key: 'End' });
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Pitch' })); expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(document.activeElement!.id);
  fireEvent.keyDown(document.activeElement!, { key: 'Home' }); expect(document.activeElement).toBe(first);
  tab('Pitch'); fireEvent.click(screen.getByRole('button', { name: `Open order ${state.world.orders[0].id}` })); const detail = screen.getByRole('region', { name: 'Selected purchasing record' }).textContent;
  for (const name of ['Technical', 'Executive']) { fireEvent.click(screen.getByRole('radio', { name })); expect(screen.getByRole('region', { name: 'Selected purchasing record' }).textContent).toBe(detail); expect(exportWorkflow(state)).toBe(before); }
});
it('opens quote, expired grant and actual exception then carries its unreviewed design question', () => {
  const s = finish('approval-delay'); const before = exportWorkflow(s); const h = desk(s);
  expect(s.status).toBe('blocked-recoverable'); expect(s.world.orders).toHaveLength(0);
  tab('Analytical'); fireEvent.click(screen.getByRole('button', { name: `Open quote ${s.world.quote!.id}` })); expect(screen.getByRole('region', { name: 'Selected purchasing record' }).textContent).toContain('400');
  tab('Analytical'); fireEvent.click(screen.getByRole('button', { name: `Open permission ${s.world.approvals[0].id}` })); expect(screen.getByText(/expired · expires/)).toBeTruthy();
  tab('Analytical'); fireEvent.click(screen.getByRole('button', { name: `Open exception ${s.blockedEventId}` }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Selected purchasing record' })).getByRole('button', { name: 'Review exception design' }));
  expect(h.review).toHaveBeenCalledExactlyOnceWith({ taskId: s.spec.task.id, eventId: s.blockedEventId, specKey: s.runKey });
  const pane = screen.getByRole('region', { name: 'HAZOP design review' }); expect(pane.textContent).toContain(s.blockedEventId); expect(pane.textContent).toContain('Related timing finding—different object/coverage');
  fireEvent.click(within(pane).getByRole('button', { name: 'Next review question' })); expect(document.activeElement?.textContent).toBe('Departure');
  expect(exportWorkflow(s)).toBe(before); fireEvent.click(within(pane).getByRole('button', { name: 'Inspect technical evidence' })); expect(h.inspect).toHaveBeenCalledExactlyOnceWith(s.blockedEventId);
});
it.each(['A', 'B'] as const)('%s unsafe confirmation remains actual orders, not a fabricated expiry denial queue', mode => {
  const s = finish('approval-delay', mode); desk(s); tab('Pitch'); expect(s.world.orders).toHaveLength(1); expect(selectWorkflow(s).metrics.unsafeCommittedEffects).toBe(1);
  tab('Analytical'); expect(screen.getByText(/No refresh\/reconciliation action is currently available/)).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Request one approval refresh' })).toBeNull();
});
it('keeps an order visible while response is unknown and retains exact identity after reconciliation', () => {
  let s = finish('lost-purchase-response'); const oldId = s.world.orders[0].id; const h = desk(s); expect(selectWorkflow(s).metrics.completed).toBe(false); tab('Pitch'); expect(screen.getByRole('button', { name: `Open order ${oldId}` })).toBeTruthy();
  tab('Analytical'); fireEvent.click(screen.getByRole('button', { name: `Open exception ${s.unknownEventId}` })); expect(screen.getByText(/A reply is missing/)).toBeTruthy();
  s = workflowReducer(s, { type: 'reconcile', unknownEventId: s.unknownEventId! }); for (let i = 0; i < 100 && selectWorkflow(s).controls.canStep; i++) s = workflowReducer(s, { type: 'step' });
  h.rerender(<AudienceProvider><PurchasingOperations state={s} onInspect={h.inspect}/></AudienceProvider>); tab('Pitch'); expect(screen.getByRole('button', { name: `Open order ${oldId}` })).toBeTruthy(); expect(s.world.orders).toHaveLength(1);
});
it('fails a stale selection visibly after explicit reset without inventing a replacement record', () => {
  const s = finish('nominal'); const h = desk(s); tab('Pitch'); fireEvent.click(screen.getByRole('button', { name: `Open order ${s.world.orders[0].id}` }));
  h.rerender(<AudienceProvider><PurchasingOperations state={workflowReducer(s, { type: 'reset' })} onInspect={h.inspect}/></AudienceProvider>);
  expect(screen.getByText('Selected record no longer available in this run. No model was changed.')).toBeTruthy(); expect(h.inspect).not.toHaveBeenCalled();
});
it('keeps quotation finding and approval simulation coverage distinct through every review question', () => {
  const state = finish('lost-purchase-response'); const before = exportWorkflow(state); render(<HazopConversation state={state} context={{ taskId: 'unavailable', eventId: 'not-an-event' }}/>);
  expect(screen.getByText(/Selected exception is no longer available/)).toBeTruthy(); expect(screen.getByText(/active run is not the approval-expiry exercise/i)).toBeTruthy();
  for (let i = 0; i < 5; i++) { expect(screen.getByText('Related timing finding—different object/coverage')).toBeTruthy(); if (i < 4) fireEvent.click(screen.getByRole('button', { name: 'Next review question' })); }
  expect(screen.getByText(/Residual risk, severity, likelihood and business benefit are unknown/)).toBeTruthy(); expect(screen.queryByRole('button', { name: /save|assign|accept|approve/i })).toBeNull(); expect(exportWorkflow(state)).toBe(before);
});
it('places shared recommendation before both entries, whose navigation never applies or starts a scenario', async () => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) }); vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.location.hash = '#/overview'; render(<App/>); const recommendation = screen.getByRole('region', { name: 'HAZOP recommendation' });
  expect(recommendation.textContent).toContain('does not execute a stop or prove safety');
  const entry = within(recommendation).getByRole('link', { name: 'Open the purchasing workspace' }); expect(entry.getAttribute('href')).toBe('#/simulator');
  fireEvent.click(entry); await act(async () => { window.location.hash = entry.getAttribute('href')!; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(screen.getByRole('region', { name: 'Purchasing operations' })).toBeTruthy(); expect(screen.getByRole('region', { name: 'Purchasing operations' }).textContent).toContain('Active run: Nominal procurement'); expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('0 transitions'); expect(screen.getByText(/Active: Nominal procurement/, { selector: '.workflow-active > strong' })).toBeTruthy();
});

it('uses exactly three business issues with working records and persistent material coverage warning', () => {
  const state = finish('approval-delay'); const before = exportWorkflow(state); desk(state);
  expect(screen.getAllByRole('tab').map(element => element.textContent)).toEqual(['Conceptual', 'Analytical', 'Pitch']);
  for (const name of ['Conceptual', 'Analytical', 'Pitch']) {
    tab(name); expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByText('Related timing finding—different object/coverage')).toBeTruthy(); expect(exportWorkflow(state)).toBe(before);
  }
  tab('Analytical'); expect(screen.getByRole('button', { name: `Open quote ${state.world.quote!.id}` })).toBeTruthy();
  expect(screen.getByRole('button', { name: `Open permission ${state.world.approvals[0].id}` })).toBeTruthy();
  expect(screen.getByRole('button', { name: `Open exception ${state.blockedEventId}` })).toBeTruthy();
});
it('keeps the recommendation concise without losing the tested non-guarantee or either entry', () => {
  render(<AudienceProvider><CaseBrief/></AudienceProvider>);
  const region = screen.getByRole('region', { name: 'HAZOP recommendation' });
  const words = Array.from(region.querySelectorAll('h2,p,a')).map(element => element.textContent).join(' ').trim().split(/\s+/);
  expect(words.length).toBeLessThanOrEqual(85);
  expect(region.textContent).toContain('does not execute a stop or prove safety');
  expect(within(region).getByRole('link', { name: 'Open the purchasing workspace' })).toBeTruthy();
  expect(within(region).getByRole('link', { name: 'Inspect the technical mechanism' })).toBeTruthy();
});

it('Pitch never invents confirmation in the unsafe-commit-before-confirmation interval', () => {
  let state = createWorkflow(scenarioSpec('approval-delay', 'A'));
  for (let i = 0; i < 100 && !selectWorkflow(state).metrics.unsafeCommittedEffects; i++) state = workflowReducer(state, { type: 'step' });
  expect(selectWorkflow(state).metrics.unsafeCommittedEffects).toBeGreaterThan(0);
  expect(selectWorkflow(state).metrics.completed).toBe(false);
  desk(state); tab('Pitch'); expect(screen.getByText('An unsafe commitment exists; confirmation is absent.')).toBeTruthy();
  expect(screen.queryByText('Confirmation includes an unsafe commitment.')).toBeNull();
});

it('initial Pitch offers the existing evidence-limitations destination without inventing an event', () => {
  const state = createWorkflow(scenarioSpec()); const before = exportWorkflow(state); const h = desk(state);
  tab('Pitch'); const panel = screen.getByRole('tabpanel');
  expect(within(panel).getByRole('link', { name: 'View evidence limitations' }).getAttribute('href')).toBe('#/assurance');
  expect(within(panel).queryByRole('button', { name: 'Inspect technical evidence' })).toBeNull();
  expect(state.events.some(event => event.type === 'order-committed')).toBe(false);
  expect(exportWorkflow(state)).toBe(before); expect(h.inspect).not.toHaveBeenCalled(); expect(h.review).not.toHaveBeenCalled();
});
