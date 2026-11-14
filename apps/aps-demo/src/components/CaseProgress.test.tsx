// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext.tsx';
import { Simulator } from '../routes/Simulator.tsx';
import { createComparison } from '../domain/comparison.ts';
import { timingReference } from './CaseProgress.tsx';

vi.mock('./DiscussionWorksheet.tsx', () => ({ DiscussionWorksheet: () => <section id="discussion" tabIndex={-1} aria-label="Test discussion">Discussion destination</section> }));

function StateProbe() {
  const { runs, selectedRun } = useSession();
  return <output aria-label="Retained state">{JSON.stringify({ count: runs.length, selected: selectedRun?.id, age: selectedRun?.request.approvalAge, decision: selectedRun?.results.C.decision })}</output>;
}
function setup() {
  window.location.hash = '#/simulator';
  return render(<SessionProvider><Simulator/><StateProbe/></SessionProvider>);
}
function state() { return JSON.parse(screen.getByLabelText('Retained state').textContent!); }
afterEach(cleanup);

describe('guided case progression', () => {
  it('names the bundles before prediction and prevents later steps before a comparison', () => {
    setup();
    const bundles = screen.getByLabelText('The two control bundles');
    expect(bundles.textContent).toContain('B · Tool permission + spend limit');
    expect(bundles.textContent).toContain('C · Lifecycle checks added');
    const steps = screen.getByRole('navigation', { name: 'Case investigation steps' });
    expect((within(steps).getByRole('button', { name: /2 · Change one condition/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(steps).getByRole('button', { name: /3 · Form a position/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(state().count).toBe(0);
  });

  it('Try59 changes only the draft, preserves the original result, and requires explicit evaluation', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Run comparison' }));
    expect(state()).toEqual({ count: 1, selected: 'comparison-1', age: 61, decision: 'deny' });
    fireEvent.click(screen.getByRole('button', { name: 'Try 59 seconds' }));
    expect(state()).toEqual({ count: 1, selected: 'comparison-1', age: 61, decision: 'deny' });
    const age = screen.getByLabelText('Approval age (logical seconds)') as HTMLInputElement;
    expect(age.value).toBe('59');
    expect(document.activeElement).toBe(age);
    expect(screen.getByText(/The retained results below still describe/).textContent).toContain('age 61s');
    expect((screen.getByRole('button', { name: /3 · Form a position/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Run comparison' }));
    expect(state()).toEqual({ count: 2, selected: 'comparison-2', age: 59, decision: 'allow' });
    const delta = screen.getByLabelText('Timing variation comparison');
    expect(delta.textContent).toContain('61s · B allow · C deny');
    expect(delta.textContent).toContain('59s · B allow · C allow');
    fireEvent.click(screen.getByRole('button', { name: 'Form a position →' }));
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Test discussion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Return to original comparison' }));
    expect(state()).toEqual({ count: 2, selected: 'comparison-1', age: 61, decision: 'deny' });
  });

  it('gives fixed objective-conflict cases an inspection step without pretending timing is editable', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Choose a case'), { target: { value: 'conflict' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run comparison' }));
    expect(state().decision).toBe('review');
    expect(screen.queryByRole('button', { name: 'Try 59 seconds' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /2 · Inspect the decision/ }));
    expect(document.activeElement?.id).toBe('case-path');
    expect(screen.queryByLabelText('Timing variation comparison')).toBeNull();
    expect(screen.queryByLabelText('Approval age (logical seconds)')).toBeNull();
  });

  it('never calls a changed baseline, changed request field or another case a timing-only variation', () => {
    const a = createComparison('comparison-1', { caseId: 'stale', approvalAge: '61' });
    const b = createComparison('comparison-2', { caseId: 'stale', approvalAge: '59' });
    expect(timingReference(b, [a, b])).toBe(a);
    expect(timingReference(b, [{ ...a, baseline: { orders: 1, spend: 300 } }])).toBeUndefined();
    expect(timingReference(b, [{ ...a, request: { ...a.request, amount: 500 } }])).toBeUndefined();
    expect(timingReference(b, [createComparison('comparison-3', { caseId: 'normal', approvalAge: '0' })])).toBeUndefined();
  });
});
