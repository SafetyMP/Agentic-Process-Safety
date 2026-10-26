// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { AudienceProvider } from './AudienceView.tsx';
import { WorkflowStage } from './WorkflowStage.tsx';
import { createWorkflow, exportWorkflow, scenarioSpec, selectWorkflow, workflowReducer } from '../workflow/index.ts';
import type { WorkflowCommand } from '../workflow/index.ts';
afterEach(cleanup);
it.each(['approval-delay', 'lost-purchase-response'] as const)('%s Executive event link reveals and focuses the exact record, including repeated selection', scenario => {
  let state = createWorkflow(scenarioSpec(scenario, 'C'));
  for (let i = 0; i < 100 && selectWorkflow(state).controls.canStep; i++) state = workflowReducer(state, { type: 'step' });
  const view = selectWorkflow(state); const id = scenario === 'approval-delay' ? view.controls.blockedEventId! : view.controls.unknownEventId!;
  expect(id).toBeTruthy(); const snapshot = exportWorkflow(state); const command = vi.fn<(c: WorkflowCommand) => void>();
  render(<AudienceProvider><WorkflowStage state={state} onCommand={command} onExport={() => exportWorkflow(state)} onImport={() => ({ ok: false, message: 'Unused' })}/></AudienceProvider>);
  for (let click = 0; click < 2; click++) {
    expect((screen.getByRole('radio', { name: 'Executive' }) as HTMLInputElement).checked).toBe(true);
    const decision = screen.getByRole('region', { name: scenario === 'approval-delay' ? 'Approval refresh decision' : 'Unknown outcome decision' });
    fireEvent.click(within(decision).getByRole('button', { name: id }));
    expect((screen.getByRole('radio', { name: 'Technical' }) as HTMLInputElement).checked).toBe(true);
    const inspector = screen.getByRole('region', { name: 'Causal event inspector' });
    expect(inspector.textContent).toContain(id); expect(document.activeElement).toBe(within(inspector).getByRole('heading', { name: 'Event inspector' }));
    expect(exportWorkflow(state)).toBe(snapshot); expect(command).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: 'Executive' }));
    expect(exportWorkflow(state)).toBe(snapshot); expect(command).not.toHaveBeenCalled();
  }
});

// Execute only the runner's navigation helper closure against a documented page
// protocol double. This is NOT Chromium execution, artifact or visual evidence.
function navigation() {
  const source = readFileSync('scripts/e2e.mjs', 'utf8');
  const start = source.indexOf('  const executiveHeadings ='); const end = source.indexOf('  const stat =', start);
  expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
  let mode = 'Executive'; let url = ''; const calls: string[] = [];
  const page = {
    goto: async (next: string) => { if (!url) mode = 'Executive'; url = next; calls.push('goto'); },
    reload: async () => { mode = 'Executive'; calls.push('reload'); },
    getByRole: (role: string, options: { name: string }) => ({ role, name: options.name, check: async () => { mode = options.name; calls.push(`select:${mode}`); } }),
    locator: (selector: string) => ({ selector, first() { return this; } }),
  };
  const browserExpect = (locator: { role?: string; name?: string; selector?: string }) => ({
    toBeChecked: async () => { calls.push(`checked:${locator.name}`); expect(mode).toBe(locator.name); },
    toBeVisible: async () => { if (locator.role === 'heading' || locator.selector?.startsWith('[data-executive')) { calls.push('visible:executive'); expect(mode).toBe('Executive'); } },
  });
  const helpers = new Function('page', 'expect', 'origin', 'prefix', `let assertions = 0;\n${source.slice(start, end)}\nreturn { go, freshExecutive, assertions: () => assertions };`)(page, browserExpect, 'http://local', '/agentic-process-safety/') as { go: (route: string) => Promise<void>; freshExecutive: (route: string) => Promise<void>; assertions: () => number };
  return { ...helpers, calls, audience: () => mode };
}
it('Technical hash navigation does not misassert a fresh Executive default', async () => {
  const h = navigation(); await h.go('overview'); await h.go('hazop'); await h.go('assurance');
  expect(h.audience()).toBe('Technical'); expect(h.calls.filter(c => c === 'reload')).toHaveLength(0);
  expect(h.calls.filter(c => c === 'checked:Executive')).toHaveLength(0);
  expect(h.calls.filter(c => c === 'checked:Technical')).toHaveLength(3); expect(h.assertions()).toBe(6);
});
it('every supplementary Executive route deliberately reloads before asserting default', async () => {
  const h = navigation(); await h.go('overview');
  for (const route of ['overview', 'hazop', 'governance', 'simulator', 'assurance']) {
    const start = h.calls.length; await h.freshExecutive(route);
    expect(h.calls.slice(start)).toEqual(['goto', 'reload', 'checked:Executive', 'visible:executive', 'visible:executive']);
    expect(h.audience()).toBe('Executive'); await h.go(route); expect(h.audience()).toBe('Technical');
  }
});
it.each(['approval-delay', 'lost-purchase-response'] as const)('%s manual audience radio selection retains focus after earlier explicit inspection', scenario => {
  let state = createWorkflow(scenarioSpec(scenario, 'C'));
  for (let i = 0; i < 100 && selectWorkflow(state).controls.canStep; i++) state = workflowReducer(state, { type: 'step' });
  const view = selectWorkflow(state); const id = scenario === 'approval-delay' ? view.controls.blockedEventId! : view.controls.unknownEventId!;
  const command = vi.fn<(c: WorkflowCommand) => void>(); const before = exportWorkflow(state);
  render(<AudienceProvider><WorkflowStage state={state} onCommand={command} onExport={() => exportWorkflow(state)} onImport={() => ({ ok: false, message: 'Unused' })}/></AudienceProvider>);
  const decision = screen.getByRole('region', { name: scenario === 'approval-delay' ? 'Approval refresh decision' : 'Unknown outcome decision' });
  fireEvent.click(within(decision).getByRole('button', { name: id }));
  const inspector = screen.getByRole('region', { name: 'Causal event inspector' });
  expect(document.activeElement).toBe(within(inspector).getByRole('heading', { name: 'Event inspector' }));
  for (const name of ['Executive', 'Technical', 'Executive', 'Technical']) {
    const radio = screen.getByRole('radio', { name }); radio.focus(); fireEvent.click(radio);
    expect(document.activeElement).toBe(radio); expect((radio as HTMLInputElement).checked).toBe(true);
    expect(exportWorkflow(state)).toBe(before); expect(command).not.toHaveBeenCalled();
  }
  expect(screen.getByRole('region', { name: 'Causal event inspector' }).textContent).toContain(id);
});
