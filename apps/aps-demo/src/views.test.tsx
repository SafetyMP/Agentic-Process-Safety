// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App.tsx';
import { Hazop } from './routes/Hazop.tsx';
import { Governance } from './routes/Governance.tsx';
import { Assurance } from './routes/Assurance.tsx';
import { Overview } from './routes/Overview.tsx';
import { stories, type Mode } from './domain/scenarios.ts';
import { initialState, reducer } from './domain/simulation.ts';
import { scopeHazard } from './data.ts';
import { TestEvidence } from './components/TestEvidence.tsx';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Exercise the installed Playwright engine's label text and exact matcher, rather
// than Testing Library's different handling of text inside nested selects.
const require = createRequire(join(process.cwd(), 'package.json'));
const bundle = readFileSync(join(dirname(require.resolve('playwright-core')), 'lib/coreBundle.js'), 'utf8');
const injectedLiteral = bundle.split('\n').find(line => line.startsWith('    source5 = '))!;
const injectedSource = runInNewContext(injectedLiteral.trim().slice('source5 = '.length, -1)) as string;
const exactLabels = new Function('module', 'CSS', injectedSource + `
  return (root, text) => Array.from(root.querySelectorAll('select')).filter(element =>
    getElementLabels(new Map(), element).some(createTextMatcher(JSON.stringify(text) + 's', true).matcher));
`)({ exports: {} }, { escape: (id: string) => {
  // jsdom lacks CSS.escape. These fixed IDs require no escaping; reject any
  // other syntax rather than substituting an approximate selector engine.
  if (!/^[a-z][a-z-]*$/.test(id)) throw new Error('CSS.escape required for this ID');
  return id;
} }) as (root: Document, text: string) => HTMLSelectElement[];

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  class ResizeObserverMock { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  // jsdom does not perform layout. Supply geometry without mocking chart data or decisions.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, width: 700, height: 270, top: 0, right: 700, bottom: 270, left: 0, toJSON: () => ({}) }));
});
afterEach(() => { cleanup(); window.location.hash = ''; vi.useRealTimers(); });

describe('evidence-bound interactive views', () => {
  it('keeps exact Playwright labels usable after malformed-route reload and filter changes', () => {
    window.location.hash = '#/hazop?hazard=unknown&node=invalid';
    const view = render(<App/>);
    view.unmount(); // Fresh mount models reload; actual browser reload remains in unchanged CI.
    render(<App/>);
    const nodes = exactLabels(document, 'Agent node');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].value).toBe('all');
    fireEvent.change(nodes[0], { target: { value: 'supplier' } });
    expect(screen.getByText('16 / 96 findings')).toBeTruthy();
    expect(exactLabels(document, 'Agent node')[0].value).toBe('supplier');
    expect(exactLabels(document, 'Guideword / deviation')).toHaveLength(1);
    expect(exactLabels(document, 'Sort findings')).toHaveLength(1);
  });
  it('recovers malformed links and keeps empty filters safe', () => {
    render(<Hazop params={new URLSearchParams('hazard=unknown&node=invalid')}/>);
    expect(screen.getByText('96 / 96 findings')).toBeTruthy();
    expect((screen.getByLabelText('Agent node') as HTMLSelectElement).value).toBe('all');
    fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'no-such-finding' } });
    expect(screen.getByText(/No findings match/)).toBeTruthy();
    expect(screen.getByText(/Severity: unknown/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Agent node'), { target: { value: 'supplier' } });
    expect(screen.getByText('0 / 96 findings')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: '' } });
    expect(screen.getByText('16 / 96 findings')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('table')).getAllByRole('button')[0]);
    expect(screen.getByRole('heading', { name: /\/ supplier$/ })).toBeTruthy();
  });
  it('discloses an absent objective-arbitration test instead of inventing a selector', () => {
    render(<TestEvidence control="GAP-CONFLICTING_OBJECTIVES"/>);
    expect(screen.getByText('No source test exists in this mapping. This remains an explicit control gap.')).toBeTruthy();
    expect(document.body.textContent).not.toContain('tests/test_governance.py::none');
  });
  it('shows source-backed finite coverage and prevented-call denominators separately', () => {
    render(<TestEvidence control={null}/>);
    const table = screen.getByRole('table', { name: 'Recorded case coverage and prevented attack calls; finite oracle observations' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(within(row).getByText('9/9')).toBeTruthy();
      expect(within(row).getByText('1/1')).toBeTruthy();
    }
    for (const value of ['0/10', '3/9', '8/8']) expect(within(table).getByText(value)).toBeTruthy();
  });
  it('inspects all eight topology entities and displays the shared simulated outcome honestly', () => {
    let state = initialState(42, 'C', 'unauthorized');
    const view = render(<Overview state={state}/>);
    const controls = within(screen.getByLabelText('Select topology entity'));
    expect(controls.getAllByRole('button')).toHaveLength(8);
    for (const id of ['demand', 'inventory', 'supplier', 'finance', 'purchase', 'orchestrator']) {
      fireEvent.click(controls.getByRole('button', { name: id }));
      expect(within(screen.getByLabelText('Selected topology entity')).getByRole('heading', { name: id })).toBeTruthy();
    }
    fireEvent.click(controls.getByRole('button', { name: 'Policy gateway' }));
    expect(screen.getByText(/No decision recorded. Three logical steps/)).toBeTruthy();
    for (let i = 0; i < 3; i++) state = reducer(state, { type: 'step' });
    view.rerender(<Overview state={state}/>);
    expect(screen.getByText(/DENY · SIMULATED: Actor lacks purchase tool permission/)).toBeTruthy();
    fireEvent.click(controls.getByRole('button', { name: 'Assurance' }));
    const panel = within(screen.getByLabelText('Selected topology entity'));
    expect(panel.getByText('1 unsafe attempts · 0 unsafe executed · 1 blocked')).toBeTruthy();
    expect(panel.getByText(`Latest event: ${state.events[0].id}`)).toBeTruthy();
    expect(panel.getByRole('link').getAttribute('href')).toBe('#/assurance');
    fireEvent.click(controls.getByRole('button', { name: 'inventory' }));
    expect(screen.getByText('Individual execution state is not modeled for this agent.')).toBeTruthy();
  });
  it('walks five stages and preserves the same blocked outcome through hazard and story links', async () => {
    window.location.hash = '#/overview';
    render(<App/>);
    const navigate = async (name: string) => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name }));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    };
    await navigate('Begin guided walkthrough →');
    expect(screen.getByText('WALKTHROUGH / 1 OF 5')).toBeTruthy();
    await navigate('Next');
    expect(screen.getByText('WALKTHROUGH / 2 OF 5')).toBeTruthy();
    await navigate('Next');
    expect(screen.getByRole('heading', { name: 'AUTHORITY ESCALATION / supplier' })).toBeTruthy();
    await navigate('Next');
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate simulated request' }));
    expect(screen.getByText('DENY · SIMULATED')).toBeTruthy();
    await navigate('Next');
    expect(screen.getByText('WALKTHROUGH / 5 OF 5')).toBeTruthy();
    expect(screen.getByText(/1 unsafe attempts · 0 unsafe executed · 1 blocked/)).toBeTruthy();
    await navigate('Back');
    expect(screen.getByText('DENY · SIMULATED')).toBeTruthy();
    await navigate('Next');
    expect(screen.getByText(/1 unsafe attempts · 0 unsafe executed · 1 blocked/)).toBeTruthy();
    await navigate('Restart');
    expect(screen.getByText('WALKTHROUGH / 1 OF 5')).toBeTruthy();
    await navigate('Close walkthrough');
    expect(screen.queryByLabelText('Guided walkthrough')).toBeNull();
  });
  it('filters and sorts all unverified hazards without inventing ratings', () => {
    render(<Hazop params={new URLSearchParams(`hazard=${scopeHazard.id}`)}/>);
    expect(screen.getByText('96 / 96 findings')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Agent node'), { target: { value: 'supplier' } });
    expect(screen.getByText('16 / 96 findings')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Guideword / deviation'), { target: { value: 'AUTHORITY_ESCALATION' } });
    expect(screen.getByText('1 / 96 findings')).toBeTruthy();
    const register = screen.getByRole('table', { name: 'Generated hazards, all unverified with null ratings' });
    fireEvent.click(within(register).getByRole('button'));
    expect(screen.getByRole('heading', { name: 'AUTHORITY ESCALATION / supplier' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Sort findings'), { target: { value: 'deviation' } });
    fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'no-such-hazard' } });
    expect(screen.getByText(/No findings match/)).toBeTruthy();
    expect(screen.getByText(/Severity: unknown/)).toBeTruthy();
  });
  for (const story of stories) for (const mode of ['A', 'B', 'C'] as Mode[]) {
    it(`shows objective, operation, reason and provenance for ${story.id}/${mode}`, () => {
      let state = initialState(42, mode, story.id);
      const dispatch = vi.fn(action => { state = reducer(state, action); });
      const view = render(<Governance state={state} dispatch={dispatch}/>);
      expect(screen.getByText(story.objective)).toBeTruthy();
      expect(screen.getByText(story.operation)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Evaluate simulated request' }));
      expect(dispatch).toHaveBeenCalledTimes(3);
      view.rerender(<Governance state={state} dispatch={dispatch}/>);
      expect(within(document.querySelector('.event') as HTMLElement).getByText(state.events[0].reason)).toBeTruthy();
      expect(screen.getByText(`${state.events[0].decision.toUpperCase()} · SIMULATED`)).toBeTruthy();
      expect(screen.getByText('Recorded experimental results')).toBeTruthy();
      if (state.pending) { fireEvent.click(screen.getByRole('button', { name: 'Deny simulated request' })); expect(state.events.at(-1)?.decision).toBe('deny'); }
    });
  }
  it('keeps live outcomes distinct from the frozen numerator/denominator oracle and replays recorded calls', () => {
    let state = initialState(42, 'C', 'unauthorized');
    for (let i = 0; i < 3; i++) state = reducer(state, { type: 'step' });
    render(<Assurance state={state} params={new URLSearchParams('trial=12')}/>);
    expect(screen.getByText(/1 unsafe attempts · 0 unsafe executed · 1 blocked/)).toBeTruthy();
    for (const count of ['10/10', '6/9', '0/8', '5/10']) expect(screen.getAllByText(count).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Replay next recorded call' }));
    expect(screen.getByText(/1\/\d+ calls shown/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restart replay' }));
    expect(screen.getByText(/0\/\d+ calls shown/)).toBeTruthy();
    expect(screen.getByText(/production gap|objective arbitration remains a gap/)).toBeTruthy();
  });
  it('runs, pauses, resets, isolates modes and persists theme choice', () => {
    vi.useFakeTimers(); window.location.hash = '#/simulator';
    render(<App/>);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    vi.advanceTimersByTime(3000);
    expect(screen.getByRole('status').textContent).toContain('logical tick 0');
    fireEvent.click(screen.getByRole('button', { name: 'Step' }));
    expect(screen.getByRole('status').textContent).toContain('logical tick 1');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('status').textContent).toContain('logical tick 0');
    fireEvent.change(screen.getByLabelText('Governance mode'), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText('Deterministic seed'), { target: { value: '-5' } });
    expect((screen.getByLabelText('Deterministic seed') as HTMLInputElement).value).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Inject selected fault' }));
    expect(screen.getByText(/Queued: Unauthorized tool execution/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('aps-theme')).toBe('dark');
  });
});
