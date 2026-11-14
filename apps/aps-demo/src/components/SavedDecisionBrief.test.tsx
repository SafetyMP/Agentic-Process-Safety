// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../App.tsx';
import { BRIEF_STORAGE_KEY, captureBriefSnapshot, createDecisionBrief, exportDecisionBrief, importDecisionBrief } from '../decisionBrief.ts';
import { createWorkflow, exportWorkflow } from '../workflow/index.ts';

beforeEach(() => {
  localStorage.clear(); window.location.hash = '#/assurance';
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); window.location.hash = ''; });
async function route(hash: string) { await act(async () => { window.location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); }); }
function owner() { return screen.getByRole('textbox', { name: 'Proposed accountable role' }) as HTMLInputElement; }
function storageBrief() { const result = importDecisionBrief(localStorage.getItem(BRIEF_STORAGE_KEY)!); if (!result.ok) throw new Error(result.message); return result.brief; }
function openTransfer() { fireEvent.click(screen.getByText('Export or import a decision brief', { selector: 'summary' })); }
function incoming() {
  const brief = createDecisionBrief(captureBriefSnapshot(createWorkflow(), 'different-run', 'different-observation', null));
  brief.notes.owner = 'Imported process owner'; brief.notes.decision = '<script>never executed</script>';
  return exportDecisionBrief(brief);
}
it('retains a unified brief across routes and audiences and restores an explicitly saved snapshot after reload', async () => {
  const h = render(<App/>);
  fireEvent.change(owner(), { target: { value: 'Procurement lead' } });
  fireEvent.click(screen.getByRole('radio', { name: 'More evidence before a recommendation' }));
  expect(screen.getByRole('status', { name: 'Brief save status' }).textContent).toContain('Unsaved changes');
  await route('#/overview'); await route('#/assurance');
  for (const name of ['Technical', 'Executive']) fireEvent.click(screen.getByRole('radio', { name }));
  expect(owner().value).toBe('Procurement lead');
  fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const saved = storageBrief(); expect(saved.notes.owner).toBe('Procurement lead'); expect(saved.position).toBe('More evidence before a recommendation');
  expect(screen.getByRole('status', { name: 'Brief save status' }).textContent).toBe('Saved in this browser.');
  h.unmount(); render(<App/>);
  expect(owner().value).toBe('Procurement lead');
  expect(screen.getByRole('status', { name: 'Brief observation status' }).textContent).toContain('The run has changed');
  expect(storageBrief()).toEqual(saved);
});
it('keeps the attached snapshot unchanged when an identical run is reset, and requires explicit reattachment', async () => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'Risk owner' } }); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const saved = storageBrief();
  await route('#/simulator'); fireEvent.click(screen.getByRole('button', { name: 'Reset workflow and clear history' })); await route('#/assurance');
  expect(screen.getByRole('status', { name: 'Brief observation status' }).textContent).toContain('The run has changed');
  expect(owner().value).toBe('Risk owner'); expect(storageBrief()).toEqual(saved);
  fireEvent.click(screen.getByRole('button', { name: 'Replace attached observations with current run' }));
  expect(screen.getByRole('status', { name: 'Brief observation status' }).textContent).not.toContain('The run has changed');
  fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const next = storageBrief(); expect(next.snapshot.runId).not.toBe(saved.snapshot.runId); expect(next.snapshot.spec).toEqual(saved.snapshot.spec);
});
it('does not reconnect a saved brief when an identical workflow replay is imported', async () => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'Retain original observation' } }); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const saved = storageBrief(); await route('#/simulator'); fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Replay JSON to validate' }), { target: { value: exportWorkflow(createWorkflow()) } });
  fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
  expect(screen.getByRole('status', { name: 'Replay import status' }).textContent).toContain('recomputed and imported');
  await route('#/assurance'); fireEvent.click(screen.getByRole('radio', { name: 'Executive' }));
  expect(owner().value).toBe('Retain original observation');
  expect(screen.getByRole('status', { name: 'Brief observation status' }).textContent).toContain('The run has changed');
  expect(storageBrief()).toEqual(saved);
  fireEvent.click(screen.getByRole('button', { name: 'Replace attached observations with current run' })); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  expect(storageBrief().snapshot.runId).not.toBe(saved.snapshot.runId);
});
it('previews imports without replacing work, preserves saved data until Save, and labels imported observations unverified', () => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'Original role' } }); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const saved = localStorage.getItem(BRIEF_STORAGE_KEY); openTransfer();
  fireEvent.change(screen.getByRole('textbox', { name: 'Brief JSON to import' }), { target: { value: incoming() } });
  fireEvent.click(screen.getByRole('button', { name: 'Preview brief import' }));
  expect(owner().value).toBe('Original role'); expect(screen.getByRole('region', { name: 'Brief import preview' }).textContent).toContain('Imported process owner');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel brief import' })); expect(owner().value).toBe('Original role');
  fireEvent.click(screen.getByRole('button', { name: 'Preview brief import' })); fireEvent.click(screen.getByRole('button', { name: 'Replace working brief with import' }));
  expect(owner().value).toBe('Imported process owner'); expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBe(saved);
  expect(screen.getByText(/Restored or imported discussion data is unverified/)).toBeTruthy();
  expect(document.querySelector('main script')).toBeNull();
  expect(screen.getByRole('status', { name: 'Brief observation status' }).textContent).toContain('The run has changed');
});
it('rejects malformed import without changing the working or saved brief and cancels preview after edited input', () => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'Keep this role' } }); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const saved = localStorage.getItem(BRIEF_STORAGE_KEY); openTransfer(); const input = screen.getByRole('textbox', { name: 'Brief JSON to import' });
  fireEvent.change(input, { target: { value: incoming() } }); fireEvent.click(screen.getByRole('button', { name: 'Preview brief import' }));
  fireEvent.change(input, { target: { value: '{' } }); expect(screen.queryByRole('region', { name: 'Brief import preview' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Preview brief import' }));
  expect(screen.getByRole('status', { name: 'Brief action status' }).textContent).toContain('Current draft and saved copy retained');
  expect(owner().value).toBe('Keep this role'); expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBe(saved);
});
it('reports storage failure while retaining editable work and a portable export', () => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'Unsaved role' } });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Quota exceeded'); });
  fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  expect(screen.getByRole('status', { name: 'Brief action status' }).textContent).toContain('Draft not saved'); expect(owner().value).toBe('Unsaved role');
  openTransfer(); fireEvent.click(screen.getByRole('button', { name: 'Prepare brief JSON' }));
  const result = importDecisionBrief((screen.getByRole('textbox', { name: 'Prepared brief JSON' }) as HTMLTextAreaElement).value);
  expect(result.ok && result.brief.notes.owner).toBe('Unsaved role');
});
it('requires confirmation to discard both working and saved copies', () => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'Preserve until confirmed' } }); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard brief…' })); expect(owner().value).toBe('Preserve until confirmed');
  fireEvent.click(screen.getByRole('button', { name: 'Keep brief' })); expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Discard brief…' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Confirm brief discard' })).getByRole('button', { name: 'Discard working and saved brief' }));
  expect(owner().value).toBe(''); expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBeNull();
});
it.each(['save', 'discard'])('does not %s over a newer saved copy from another tab', operation => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'My working role' } }); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const changed = incoming(); localStorage.setItem(BRIEF_STORAGE_KEY, changed);
  if (operation === 'save') fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  else { fireEvent.click(screen.getByRole('button', { name: 'Discard brief…' })); fireEvent.click(screen.getByRole('button', { name: 'Discard working and saved brief' })); }
  expect(owner().value).toBe('My working role'); expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBe(changed);
  expect(screen.getByRole('region', { name: 'Saved brief conflict' })).toBeTruthy();
  expect(screen.getByRole('status', { name: 'Brief save status' }).textContent).not.toBe('Saved in this browser.');
  fireEvent.click(screen.getByRole('button', { name: 'Preview saved browser copy' }));
  expect(owner().value).toBe('My working role');
  fireEvent.click(screen.getByRole('button', { name: 'Replace working brief with import' }));
  expect(owner().value).toBe('Imported process owner'); expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBe(changed);
});
it('notices storage events and refuses a saved-copy preview that changed again before confirmation', () => {
  render(<App/>); fireEvent.change(owner(), { target: { value: 'Keep my current work' } }); fireEvent.click(screen.getByRole('button', { name: 'Save brief locally' }));
  const changed = incoming(); localStorage.setItem(BRIEF_STORAGE_KEY, changed);
  act(() => window.dispatchEvent(new StorageEvent('storage', { key: BRIEF_STORAGE_KEY, newValue: changed })));
  expect(screen.getByRole('region', { name: 'Saved brief conflict' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Preview saved browser copy' })); localStorage.removeItem(BRIEF_STORAGE_KEY);
  fireEvent.click(screen.getByRole('button', { name: 'Replace working brief with import' }));
  expect(owner().value).toBe('Keep my current work'); expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBeNull();
  expect(screen.getByRole('status', { name: 'Brief action status' }).textContent).toContain('changed again');
});
it('does not overwrite malformed saved data just by mounting, editing, or exporting', () => {
  localStorage.setItem(BRIEF_STORAGE_KEY, '{broken'); render(<App/>);
  expect(screen.getByRole('status', { name: 'Brief action status' }).textContent).toContain('could not be loaded');
  fireEvent.change(owner(), { target: { value: 'Recovery draft' } }); openTransfer(); fireEvent.click(screen.getByRole('button', { name: 'Prepare brief JSON' }));
  expect(localStorage.getItem(BRIEF_STORAGE_KEY)).toBe('{broken'); expect(owner().value).toBe('Recovery draft');
});
