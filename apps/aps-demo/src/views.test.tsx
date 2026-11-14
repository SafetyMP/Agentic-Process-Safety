// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { App } from './App.tsx';
import { Simulator } from './routes/Simulator.tsx';
import { Assurance } from './routes/Assurance.tsx';
import { SessionProvider, useSession } from './components/SessionContext.tsx';
import { TestEvidence } from './components/TestEvidence.tsx';
import type { ComparisonRun } from './domain/comparison.ts';
import type { DiscussionDraft } from './domain/session.ts';
import { experiment, hazards } from './data.ts';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Installed browser-engine label semantics catch nested-control label regressions
// that Testing Library alone does not reproduce.
const require = createRequire(join(process.cwd(), 'package.json'));
const bundle = readFileSync(join(dirname(require.resolve('playwright-core')), 'lib/coreBundle.js'), 'utf8');
const injectedLiteral = bundle.split('\n').find(line => line.startsWith('    source5 = '))!;
const injectedSource = runInNewContext(injectedLiteral.trim().slice('source5 = '.length, -1)) as string;
const exactLabels = new Function('module', 'CSS', injectedSource + `
  return (root, text, exact = true) => Array.from(root.querySelectorAll('select,input,textarea')).filter(element =>
    getElementLabels(new Map(), element).some(createTextMatcher(exact ? JSON.stringify(text) + 's' : text, true).matcher));
`)({ exports: {} }, { escape: (id: string) => {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('CSS.escape required for this ID');
  return id;
} }) as (root: Document, text: string, exact?: boolean) => (HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement)[];

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
  vi.stubGlobal('ResizeObserver', class {
    callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) { this.callback = callback; }
    observe(target: Element) { this.callback([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    unobserve() {} disconnect() {}
  });
  // Geometry only: chart data, rule evaluation and rendered components stay real.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.classList.contains('recharts-legend-wrapper') ? 36 : this.tagName === 'SPAN' ? 16 : 270;
    return { x: 0, y: 0, width: 700, height, top: 0, right: 700, bottom: height, left: 0, toJSON: () => ({}) };
  });
});
beforeEach(() => { localStorage.clear(); window.location.hash = ''; });
afterEach(() => { cleanup(); window.location.hash = ''; vi.useRealTimers(); });

interface Snapshot {
  runs: ComparisonRun[]; selectedRun: ComparisonRun | null;
  discussions: Record<string, DiscussionDraft>; isDirty: boolean; exported: string;
}
function SessionProbe() {
  const { runs, selectedRun, discussions, isDirty, exportJSON } = useSession();
  return <output data-testid="session-probe">{JSON.stringify({ runs, selectedRun, discussions, isDirty, exported: exportJSON() })}</output>;
}
function renderSession(children: ReactNode) { return render(<SessionProvider>{children}<SessionProbe/></SessionProvider>); }
function snapshot(): Snapshot { return JSON.parse(screen.getByTestId('session-probe').textContent!) as Snapshot; }
function runComparison() { fireEvent.click(screen.getByRole('button', { name: 'Run comparison' })); }
function changeAge(value: string) { fireEvent.change(screen.getByLabelText('Approval age (logical seconds)', { exact: true }), { target: { value } }); }
async function navigate(hash: string) {
  await act(async () => { window.location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); });
}

describe('paired case investigation', () => {
  const expected = {
    normal: ['allow', 'allow', 'allow'], unauthorized: ['allow', 'deny', 'deny'],
    spending: ['allow', 'deny', 'deny'], delegation: ['allow', 'allow', 'deny'],
    approval: ['allow', 'allow', 'deny'], replay: ['allow', 'allow', 'deny'],
    stale: ['allow', 'allow', 'deny'], conflict: ['allow', 'allow', 'review'], context: ['allow', 'allow', 'deny'],
  };
  for (const [caseId, decisions] of Object.entries(expected)) {
    it(`evaluates ${caseId} against all three fixed bundles from one input`, () => {
      renderSession(<Simulator/>);
      fireEvent.change(screen.getByLabelText('Choose a case', { exact: true }), { target: { value: caseId } });
      runComparison();
      const run = snapshot().selectedRun!;
      expect(run.caseId).toBe(caseId);
      expect(['A', 'B', 'C'].map(mode => run.results[mode as 'A' | 'B' | 'C'].decision)).toEqual(decisions);
      expect(run.baseline).toEqual({ orders: 0, spend: 0 });
      expect(document.querySelectorAll('.comparison-lane')).toHaveLength(2);
      expect(document.querySelector('.comparison-view')?.textContent).toContain(run.id);
      expect(screen.queryByRole('button', { name: 'Approve simulated request' })).toBeNull();
    });
  }
  it('retains 61 → 59 → 60 comparisons without relabeling old results or accumulating effects', () => {
    renderSession(<Simulator/>); runComparison();
    const original = snapshot().selectedRun!;
    expect(original.request.approvalAge).toBe(61);
    expect(original.results.B.effect?.after).toEqual({ orders: 1, spend: 300 });
    expect(original.results.C.effect?.after).toEqual({ orders: 0, spend: 0 });
    changeAge('59');
    expect(snapshot().isDirty).toBe(true); expect(snapshot().selectedRun).toEqual(original);
    expect(document.querySelector('.draft-notice')?.textContent).toContain('Inputs changed');
    runComparison();
    expect(snapshot().selectedRun!.results.C.decision).toBe('allow');
    expect(snapshot().selectedRun!.results.C.executedViolations).toEqual([]);
    changeAge('60'); runComparison();
    expect(snapshot().selectedRun!.results.C.decision).toBe('deny');
    expect(snapshot().runs.map(run => run.request.approvalAge)).toEqual([61, 59, 60]);
    expect(snapshot().runs[0]).toEqual(original);
    expect(snapshot().runs.every(run => run.results.B.effect?.after.orders === 1)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset inputs' }));
    expect(snapshot().runs).toHaveLength(3);
  });
  it('guides a draft-only timing variation into an explicit comparison and position', () => {
    renderSession(<Simulator/>); runComparison();
    const original = snapshot().selectedRun!;
    fireEvent.click(screen.getByRole('button', { name: 'Try 59 seconds' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Approval age (logical seconds)', { exact: true }));
    expect(snapshot().selectedRun).toEqual(original);
    expect(snapshot().runs).toHaveLength(1);
    expect(snapshot().isDirty).toBe(true);
    expect(screen.queryByLabelText('Timing variation comparison')).toBeNull();
    runComparison();
    const delta = screen.getByLabelText('Timing variation comparison');
    expect(delta.textContent).toContain('61s · B allow · C deny');
    expect(delta.textContent).toContain('59s · B allow · C allow');
    expect(document.querySelector('.comparison-view')?.textContent).toContain('Purchase with current approval');
    expect(document.querySelector('.failure-path')?.textContent).toContain('Approval remains current');
    expect(document.querySelector('.failure-path')?.textContent).toContain('Both bundles permit the request');
    fireEvent.click(screen.getByRole('button', { name: 'Form a position →' }));
    expect(document.activeElement).toBe(document.getElementById('discussion'));
    expect(snapshot().runs[0]).toEqual(original);
  });
  it('keeps missing evidence unresolved and attaches the selected run despite a changed draft', () => {
    renderSession(<Simulator/>); runComparison();
    const original = snapshot().selectedRun!;
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Gather more information' } });
    expect(screen.getByRole('heading', { name: 'Request the missing business evidence' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
    fireEvent.change(screen.getByLabelText('What remains unknown?'), { target: { value: 'Is the quotation valid?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this evidence request to my position' }));
    changeAge('59');
    fireEvent.click(screen.getByText('Inspect supporting evidence', { exact: true }));
    fireEvent.change(screen.getByLabelText('Supporting evidence'), { target: { value: 'No supplier confirmation yet.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Attach this comparison’s decisive check' }));
    const position = snapshot().discussions[original.id];
    expect(position.question).toMatch(/Is the quotation valid\?[\s\S]*Who can confirm/);
    expect(position.evidence).toContain('No supplier confirmation yet.');
    expect(position.evidence).toContain(original.id);
    expect(position.evidence).toContain(original.requestIdentity);
    expect(position.evidence).toContain('Approval freshness');
    expect(snapshot().selectedRun).toEqual(original);
    expect(snapshot().runs).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Obtain a new matching approval' } });
    expect(screen.getByRole('button', { name: 'Explore a fresh-approval request' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Use this comparison’s inputs' }));
    expect(snapshot().isDirty).toBe(false);
    expect(screen.getByRole('button', { name: 'Explore a fresh-approval request' }).hasAttribute('disabled')).toBe(false);
  });
  it('rejects invalid age drafts without evaluating a different request', () => {
    renderSession(<Simulator/>); runComparison();
    const original = snapshot().selectedRun;
    for (const value of ['', '-1', '121', '59.5']) {
      changeAge(value);
      expect(screen.getByRole('button', { name: 'Run comparison' }).hasAttribute('disabled')).toBe(true);
      expect(snapshot().selectedRun).toEqual(original);
    }
    expect(snapshot().runs).toHaveLength(1);
  });
  it('provides exact browser labels and selectable failure-path explanations', () => {
    renderSession(<Simulator/>);
    for (const label of ['Choose a case', 'Approval age (logical seconds)', 'Prediction']) expect(exactLabels(document, label), label).toHaveLength(1);
    runComparison();
    for (const label of ['Selected comparison', 'Recommended next action']) expect(exactLabels(document, label), label).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /C stops at the condition/ }));
    expect(screen.getByLabelText('Selected path stage').textContent).toContain('freshness');
    expect(snapshot().runs).toHaveLength(1);
  });
  it('binds reasoning to the original and makes fresh approval a distinct C-state fork', () => {
    renderSession(<Simulator/>); runComparison();
    const original = snapshot().selectedRun!;
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for discussion' }));
    expect(screen.getByText(/Add a rationale before marking/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Obtain a new matching approval' } });
    fireEvent.change(screen.getByLabelText('Reason for this recommendation'), { target: { value: 'Permission remains valid but the finance approval expired.' } });
    fireEvent.click(screen.getByText('Record assumptions or disagreement', { exact: true }));
    fireEvent.change(screen.getByLabelText('Dissent or another interpretation'), { target: { value: 'Fresh approval does not establish quotation validity.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for discussion' }));
    expect(snapshot().discussions[original.id].ready).toBe(true);
    expect(snapshot().selectedRun).toEqual(original); expect(localStorage.length).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Explore a fresh-approval request' }));
    const child = snapshot().selectedRun!;
    expect(child.parent).toEqual({ runId: original.id, lane: 'C' });
    expect(child.requestIdentity).not.toBe(original.requestIdentity);
    expect(child.request.approvalAge).toBe(0); expect(child.baseline).toEqual({ orders: 0, spend: 0 });
    expect(child.results.B.effect?.after).toEqual({ orders: 1, spend: 300 });
    expect(child.results.C.effect?.after).toEqual({ orders: 1, spend: 300 });
    changeAge('59'); runComparison(); changeAge('60'); runComparison();
    expect(snapshot().runs[0]).toEqual(original);
    expect(snapshot().discussions[original.id].dissent).toContain('quotation validity');
    for (const text of [original.id, child.id, 'quotation validity']) expect(snapshot().exported).toContain(text);
  });
  it('saves only on request and restores all comparison and discussion references', () => {
    renderSession(<Simulator/>); runComparison();
    const original = snapshot().selectedRun!;
    fireEvent.change(screen.getByLabelText('Reason for this recommendation'), { target: { value: 'Preserve this reasoning across explicit save/load.' } });
    expect(localStorage.length).toBe(0);
    fireEvent.click(screen.getByText('Keep or export this discussion', { exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Save in this browser' }));
    expect(localStorage.length).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear current session' }));
    expect(snapshot().runs).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Clear comparisons and notes' }));
    expect(snapshot().runs).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Load saved session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace with saved session' }));
    expect(snapshot().selectedRun).toEqual(original);
    expect(snapshot().discussions[original.id].rationale).toContain('explicit save/load');
    const href = screen.getByRole('link', { name: /Open configuration-only link/ }).getAttribute('href')!;
    expect(href).not.toContain('Preserve'); expect(href).not.toContain('rationale');
    fireEvent.click(screen.getByRole('button', { name: 'Delete browser copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved copy' }));
    expect(localStorage.length).toBe(0); expect(snapshot().selectedRun).toEqual(original);
  });
});

describe('full-app context and evidence', () => {
  it('preserves comparison and exact labels for populated reasoning across supporting views', async () => {
    window.location.hash = '#/simulator'; render(<App/>);
    const prediction = 'Only the lifecycle checks inspect approval freshness.';
    fireEvent.change(exactLabels(document, 'Why do you expect that?')[0], { target: { value: prediction } });
    runComparison();
    fireEvent.click(screen.getByText('Inspect supporting evidence', { exact: true }));
    fireEvent.click(screen.getByText('Record assumptions or disagreement', { exact: true }));
    const reasoning = {
      'Reason for this recommendation': 'Keep the denied attempt for discussion.',
      'Supporting evidence': 'Recorded stale approval comparison.',
      'Assumptions': 'The request matches the prior approval.',
      'What remains unknown?': 'Whether the quotation is still accurate.',
      'Dissent or another interpretation': 'Timely delivery also matters.',
    };
    for (const [label, value] of Object.entries(reasoning)) {
      expect(exactLabels(document, label), label).toHaveLength(1);
      fireEvent.change(exactLabels(document, label)[0], { target: { value } });
    }
    for (const route of ['hazop', 'governance', 'assurance', 'overview']) {
      await navigate(`#/${route}`); expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
    }
    await navigate('#/simulator');
    for (const [label, value] of Object.entries({ 'Why do you expect that?': prediction, ...reasoning })) {
      expect(exactLabels(document, label), label).toHaveLength(1);
      expect(exactLabels(document, label)[0].value).toBe(value);
    }
    expect(document.querySelector('.comparison-view')?.textContent).toContain('61');
  });
  it('keeps exact browser labels usable for malformed hazard links and filters', () => {
    window.location.hash = '#/hazop?hazard=unknown&node=invalid';
    const initial = render(<App/>); initial.unmount(); render(<App/>);
    const nodes = exactLabels(document, 'Agent node');
    expect(nodes).toHaveLength(1); expect(nodes[0].value).toBe('all');
    fireEvent.change(nodes[0], { target: { value: 'supplier' } });
    expect(screen.getByText('16 / 96 findings')).toBeTruthy();
    for (const label of ['Guideword / deviation', 'Sort findings', 'Theme']) expect(exactLabels(document, label)).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'no-such-hazard' } });
    expect(screen.getByText(/No findings match/)).toBeTruthy();
  });
  it('does not route an unmapped finding to an unrelated interactive case', () => {
    const unmapped = hazards.find(h => h.node === 'orchestrator' && h.deviation === 'REVERSE')!;
    window.location.hash = `#/hazop?hazard=${unmapped.id}`; render(<App/>);
    expect(screen.getByText(/No interactive case/)).toBeTruthy();
    const detail = document.querySelector(`[aria-label="${unmapped.id}"]`) ?? document.querySelector('main')!;
    expect(detail.querySelector('a[href="#/governance?story=unauthorized"]')).toBeNull();
    expect(document.body.textContent).toContain('unknown');
  });
  it('restores persisted themes on every route with exact browser matching', () => {
    for (const route of ['overview', 'hazop', 'governance', 'simulator', 'assurance']) {
      window.location.hash = `#/${route}`; const view = render(<App/>);
      for (const theme of ['light', 'dark', 'system']) {
        expect(exactLabels(document, 'Theme')).toHaveLength(1);
        fireEvent.change(exactLabels(document, 'Theme')[0], { target: { value: theme } });
        expect(document.documentElement.dataset.theme).toBe(theme === 'system' ? 'light' : theme);
      }
      fireEvent.change(exactLabels(document, 'Theme')[0], { target: { value: 'dark' } });
      view.unmount(); const restored = render(<App/>);
      expect(exactLabels(document, 'Theme')[0].value).toBe('dark'); restored.unmount();
    }
  });
  it('never changes frozen evidence through browser choices', () => {
    const frozen = JSON.stringify(experiment); renderSession(<Simulator/>);
    for (const age of ['61', '59', '60']) { changeAge(age); runComparison(); }
    expect(JSON.stringify(experiment)).toBe(frozen);
    expect(snapshot().exported).not.toContain('"status":"recorded"');
  });
  it('pairs only retained records and replays inspection without changing the browser session', () => {
    const frozen = JSON.stringify(experiment);
    const { container } = renderSession(<Assurance params={new URLSearchParams('trial=15')}/>);
    const decisive = screen.getByRole('region', { name: 'Decisive recorded event' });
    expect(decisive.textContent).toContain('purchase_mock');
    expect(decisive.textContent).toContain('ALLOW · executed');
    expect(decisive.textContent).toContain('DENY · not executed');
    const trace = container.querySelector('.recorded-full-trace')!;
    expect(trace.hasAttribute('open')).toBe(false);
    fireEvent.click(within(trace as HTMLElement).getByText('Inspect all 10 paired recorded steps'));
    expect(trace.hasAttribute('open')).toBe(true);
    const pair = container.querySelector('.recorded-pair-table')!;
    expect(pair.querySelectorAll('tbody tr')).toHaveLength(10);
    const last = pair.querySelector('tbody tr:last-child')!;
    expect(last.textContent).toContain('expired_finance_approval');
    expect(last.querySelectorAll('td')[0].textContent).toContain('ALLOW · executed');
    expect(last.querySelectorAll('td')[1].textContent).toContain('DENY · not executed');
    for (const label of ['Filter recorded arm', 'Sort recorded trials']) expect(exactLabels(document, label)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Replay next recorded call' }));
    expect(container.querySelectorAll('.replay-list li')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Show all recorded calls' }));
    expect(container.querySelectorAll('.replay-list li')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Restart replay' }));
    expect(container.querySelectorAll('.replay-list li')).toHaveLength(0);
    expect(snapshot().runs).toHaveLength(0); expect(JSON.stringify(experiment)).toBe(frozen);
  });
  it('keeps an explicitly selected different trial and refuses an invalid trial substitute', async () => {
    window.location.hash = '#/simulator'; render(<App/>); runComparison();
    await navigate('#/assurance?trial=17');
    expect(screen.getByText(/differs from the active browser case/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Recorded trial #17/ })).toBeTruthy();
    await navigate('#/assurance?trial=unknown');
    expect(screen.getByText(/No recorded trial matches/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Replay next recorded call' })).toBeNull();
    await navigate('#/simulator');
    expect(document.querySelector('.comparison-view')?.textContent).toContain('61');
  });
  it('discloses absent arbitration tests and retains finite coverage denominators', () => {
    render(<TestEvidence control="GAP-CONFLICTING_OBJECTIVES"/>);
    expect(screen.getByText('No source test exists in this mapping. This remains an explicit control gap.')).toBeTruthy();
    expect(document.body.textContent).not.toContain('tests/test_governance.py::none');
    const table = screen.getByRole('table', { name: 'Recorded case coverage and prevented attack calls; finite oracle observations' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    for (const value of ['0/10', '3/9', '8/8']) expect(within(table).getByText(value)).toBeTruthy();
  });
  it('renders chart marks with readable tick colors and exact count tables', async () => {
    const { container } = renderSession(<Assurance params={new URLSearchParams('trial=15')}/>);
    await waitFor(() => expect(container.querySelectorAll('.recharts-bar-rectangle').length).toBeGreaterThan(0));
    const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');
    const luminance = (hex: string) => {
      if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
      const c = hex.replace('#', '').match(/.{2}/g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
      return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
    };
    for (const selector of [':root', ':root[data-theme=dark]']) {
      const declaration = css.slice(css.indexOf(selector + ' {')).split('}')[0];
      const token = (name: string) => declaration.match(new RegExp(`--${name}:\\s*(#[a-f0-9]{3,6})`))![1];
      for (const tick of container.querySelectorAll('.recharts-cartesian-axis-tick-value')) {
        const fill = tick.getAttribute('fill') === 'var(--muted)' ? token('muted') : tick.getAttribute('fill')!;
        const values = [luminance(fill), luminance(token('panel'))].sort((a, b) => b - a);
        expect((values[0] + .05) / (values[1] + .05)).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const count of ['10/10', '6/9', '0/8', '5/10']) expect(screen.getAllByText(count).length).toBeGreaterThan(0);
  });
});
