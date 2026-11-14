// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext.tsx';
import { DiscussionWorksheet } from './DiscussionWorksheet.tsx';

function Controls() {
  const { runComparison, setApprovalAge, selectRun, runs, selectedRun, discussions } = useSession();
  return <>
    <button onClick={runComparison}>Test run comparison</button>
    <button onClick={() => setApprovalAge('59')}>Test fresh age</button>
    <button onClick={() => setApprovalAge('invalid')}>Test invalid age</button>
    <button onClick={() => runs[0] && selectRun(runs[0].id)}>Test select original</button>
    <output aria-label="Test outcome">{selectedRun ? `${selectedRun.results.B.decision}/${selectedRun.results.C.decision}` : 'none'}</output>
    <output aria-label="Test ready">{selectedRun && discussions[selectedRun.id]?.ready ? 'ready' : 'draft'}</output>
    <output aria-label="Test runs">{runs.length}</output>
  </>;
}

function setup() {
  window.localStorage.clear();
  window.location.hash = '#/simulator';
  return render(<SessionProvider><Controls/><DiscussionWorksheet/></SessionProvider>);
}

afterEach(cleanup);

describe('discussion remains reasoning bound to a comparison', () => {
  it('offers no navigation link for an invalid configuration and can receive routed focus', () => {
    setup();
    fireEvent.click(screen.getByText('Keep or export this discussion'));
    expect(screen.getByRole('link', { name: 'Open configuration-only link →' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Test invalid age' }));
    expect(screen.queryByRole('link', { name: 'Open configuration-only link →' })).toBeNull();
    expect(screen.getByText(/Correct the draft inputs/)).toBeTruthy();
    const section = screen.getByRole('region', { name: 'What should happen next?' });
    section.focus();
    expect(document.activeElement).toBe(section);
  });

  it('requires rationale for readiness and cannot authorize the denied operation', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for discussion' }));
    expect(screen.getByText(/Add a rationale before marking/)).toBeTruthy();
    expect(screen.getByLabelText('Test ready').textContent).toBe('draft');
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Obtain a new matching approval' } });
    fireEvent.change(screen.getByLabelText('Reason for this recommendation'), { target: { value: 'The approval expired; obtain a new exact authorization.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for discussion' }));
    expect(screen.getByLabelText('Test ready').textContent).toBe('ready');
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
  });

  it('keeps original reasoning when a changed input creates a separate comparison', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Reason for this recommendation'), { target: { value: 'Preserve this explanation for the expired request.' } });
    fireEvent.change(screen.getByLabelText('Dissent or another interpretation'), { target: { value: 'Expiry alone does not establish quote accuracy.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test fresh age' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/allow');
    expect((screen.getByLabelText('Reason for this recommendation') as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Test select original' }));
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
    expect((screen.getByLabelText('Reason for this recommendation') as HTMLTextAreaElement).value).toContain('expired request');
    expect((screen.getByLabelText('Dissent or another interpretation') as HTMLTextAreaElement).value).toContain('quote accuracy');
  });

  it('requires an explicit clear action and retains the denied original after a recovery exploration', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.click(screen.getByRole('button', { name: 'Explore a fresh-approval request' }));
    expect(screen.getByLabelText('Test runs').textContent).toBe('2');
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/allow');
    fireEvent.click(screen.getByRole('button', { name: 'Test select original' }));
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
    fireEvent.click(screen.getByText('Keep or export this discussion'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear current session' }));
    expect(screen.getByLabelText('Test runs').textContent).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Test runs').textContent).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Clear current session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear comparisons and notes' }));
    expect(screen.getByLabelText('Test runs').textContent).toBe('0');
  });
});
