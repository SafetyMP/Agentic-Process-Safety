// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../App.tsx';
import * as workflowAPI from '../workflow/index.ts';
import { experiment, hazards } from '../data.ts';
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.location.hash = ''; });
async function route(hash: string) { await act(async () => { window.location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); }); }
function audience(name: string) { fireEvent.click(screen.getByRole('radio', { name })); }
const navigation = () => screen.getByRole('navigation', { name: 'Main navigation' });
for (const [path, current, heading] of [
  ['overview', 'Conceptual', 'Use HAZOP before delegating purchasing.'],
  ['simulator', 'Analytical', 'What must stay true before we buy?'],
  ['assurance', 'Pitch', 'What should the team take from this case?'],
  ['hazop', 'Analytical', 'What can depart from intended purchasing?'],
  ['governance', 'Analytical', 'How does a request boundary change the outcome?'],
]) it(`${path} belongs to the WHOLE three-issue Executive shell without a nested framework widget`, () => {
  window.location.hash = `#/${path}`; render(<App/>);
  expect(within(navigation()).getAllByRole('link').map(link => link.textContent!.replace(/[◈⊞◇⇄◉0-9]/g, '').trim())).toEqual(['Conceptual', 'Analytical', 'Pitch']);
  expect(navigation().querySelector('[aria-current=page]')!.textContent).toContain(current);
  expect(document.querySelectorAll('h1')).toHaveLength(1); expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(heading);
  expect(document.querySelector('[role=tablist][aria-label="Purchasing business case"]')).toBeNull();
  audience('Technical'); expect(within(navigation()).getAllByRole('link')).toHaveLength(5);
  audience('Executive'); expect(within(navigation()).getAllByRole('link')).toHaveLength(3);
});
it('retains drafts, pace, stale export, replay error and actual state across all Executive destinations', async () => {
  window.location.hash = '#/simulator'; const calls = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  fireEvent.change(screen.getByLabelText('Question to examine'), { target: { value: 'approval-delay' } });
  fireEvent.click(screen.getByText('Exercise settings', { selector: 'summary' }));
  fireEvent.change(screen.getByLabelText('Purchasing authority model (A/B/C)'), { target: { value: 'A' } });
  fireEvent.change(screen.getByLabelText('Playback pace'), { target: { value: '1400' } });
  audience('Technical'); fireEvent.click(screen.getByRole('button', { name: 'Prepare current replay JSON' }));
  const stale = (screen.getByLabelText('Prepared replay snapshot') as HTMLTextAreaElement).value;
  fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
  fireEvent.change(screen.getByLabelText('Replay JSON to validate'), { target: { value: 'invalid' } }); fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
  const error = screen.getByRole('status', { name: 'Replay import status' }).textContent; const commands = calls.mock.calls.map(([, c]) => c);
  audience('Executive'); await route('#/assurance'); await route('#/overview'); await route('#/simulator');
  expect(calls.mock.calls.map(([, c]) => c)).toEqual(commands);
  expect((screen.getByLabelText('Question to examine') as HTMLSelectElement).value).toBe('approval-delay');
  expect((screen.getByLabelText('Purchasing authority model (A/B/C)') as HTMLSelectElement).value).toBe('A');
  expect((screen.getByLabelText('Playback pace') as HTMLSelectElement).value).toBe('1400');
  audience('Technical'); expect((screen.getByLabelText('Prepared replay snapshot') as HTMLTextAreaElement).value).toBe(stale);
  expect((screen.getByLabelText('Replay JSON to validate') as HTMLTextAreaElement).value).toBe('invalid'); expect(screen.getByRole('status', { name: 'Replay import status' }).textContent).toBe(error);
  expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('1 transitions');
});
it('carries actual exception/record context through Analytical support and Pitch to explicit Technical inspection', async () => {
  window.location.hash = '#/simulator'; const calls = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  fireEvent.change(screen.getByLabelText('Question to examine'), { target: { value: 'approval-delay' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply selection and start new run' }));
  for (let i = 0; i < 100 && !(screen.getByRole('button', { name: 'Step one transition' }) as HTMLButtonElement).disabled; i++) fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
  const id = screen.getByRole('region', { name: 'Approval refresh decision' }).querySelector('.text-button')!.textContent!;
  fireEvent.click(screen.getByRole('button', { name: `Open exception ${id}` })); fireEvent.click(screen.getByRole('button', { name: 'Review exception design' }));
  const commands = calls.mock.calls.map(([, c]) => c);
  await route('#/hazop?hazard=APS-f47191931b96a999a61c'); expect(screen.getByRole('region', { name: 'HAZOP design review' }).textContent).toContain(id);
  await route('#/assurance'); const detail = screen.getByRole('region', { name: 'Selected purchasing record' }); expect(detail.textContent).toContain(id);
  fireEvent.click(within(detail).getByRole('button', { name: 'Inspect technical evidence' })); await route(window.location.hash);
  expect((screen.getByRole('radio', { name: 'Technical' }) as HTMLInputElement).checked).toBe(true);
  const inspector = screen.getByRole('region', { name: 'Causal event inspector' }); expect(inspector.textContent).toContain(id); expect(document.activeElement).toBe(within(inspector).getByRole('heading', { name: 'Event inspector' }));
  expect(calls.mock.calls.map(([, c]) => c)).toEqual(commands);
  for (const name of ['Executive', 'Technical']) { const radio = screen.getByRole('radio', { name }); radio.focus(); fireEvent.click(radio); expect(document.activeElement).toBe(radio); }
});
it('preserves an actual non-timing HAZOP query rather than substituting an expiry study', () => {
  const finding = hazards.find(h => h.node === 'purchase' && h.deviation === 'MORE')!;
  window.location.hash = `#/hazop?hazard=${finding.id}`; render(<App/>); const review = screen.getByRole('region', { name: 'HAZOP design review' });
  expect(review.textContent).toContain(finding.id); expect(review.textContent).toContain(finding.intent); expect(review.textContent).toContain(finding.causes[0]);
  expect(review.textContent).toContain('No direct validation by the active purchasing run'); audience('Technical'); expect(screen.getByRole('heading', { name: 'MORE / purchase' })).toBeTruthy();
});
it('opens actual Pitch limitations from the no-event fallback without changing the model', async () => {
  window.location.hash = '#/assurance'; const calls = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  const link = screen.getByRole('link', { name: 'View evidence limitations' }); expect(link.getAttribute('href')).toBe('#/assurance?detail=limitations');
  await route(link.getAttribute('href')!); const summary = screen.getByText('Evidence and limitations', { selector: 'summary' });
  expect((summary.parentElement as HTMLDetailsElement).open).toBe(true); expect(calls).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('What should the team take from this case?');
});

it('route departure pauses the single workflow timer and returns the same case without hidden advancement', async () => {
  vi.useFakeTimers(); window.location.hash = '#/simulator'; const calls = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  fireEvent.click(screen.getByRole('button', { name: 'Start workflow' })); act(() => vi.advanceTimersByTime(900));
  expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('1 transitions');
  await route('#/assurance'); expect(calls.mock.calls.filter(([, c]) => c.type === 'pause')).toHaveLength(1);
  act(() => vi.advanceTimersByTime(5000)); expect(calls.mock.calls.filter(([, c]) => c.type === 'timer')).toHaveLength(1);
  await route('#/simulator'); expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('1 transitions');
  expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('paused'); vi.useRealTimers();
});
it('Pitch deep links retain the selected frozen trial without conflating it with the live purchasing case', () => {
  const trial = experiment.trials[0]; window.location.hash = `#/assurance?trial=${trial.sequence}`; const calls = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>);
  expect(screen.getByRole('region', { name: 'Requested evidence' }).textContent).toContain(`#${trial.sequence}`);
  expect(screen.getByRole('region', { name: 'Business case status' }).textContent).toContain('Nominal procurement'); expect(calls).not.toHaveBeenCalled();
  audience('Technical'); expect(screen.getByRole('heading', { name: new RegExp(`^Evidence #${trial.sequence} /`) })).toBeTruthy();
});

it('retains the actual manually selected HAZOP finding across audience toggles without a query', () => {
  const finding = hazards.find(h => h.node === 'purchase' && h.deviation === 'MORE')!;
  window.location.hash = '#/hazop'; const calls = vi.spyOn(workflowAPI, 'workflowReducer'); render(<App/>); audience('Technical');
  fireEvent.click(screen.getByRole('button', { name: finding.id })); audience('Executive');
  expect(screen.getByRole('region', { name: 'HAZOP design review' }).textContent).toContain(finding.id);
  audience('Technical'); expect(screen.getByRole('heading', { name: 'MORE / purchase' })).toBeTruthy(); expect(calls).not.toHaveBeenCalled();
});
