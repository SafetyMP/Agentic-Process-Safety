// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SessionProvider, useSession } from './SessionContext.tsx';
import { DiscussionWorksheet } from './DiscussionWorksheet.tsx';

function Controls() {
  const { runComparison, setApprovalAge, setCase, selectRun, runs, selectedRun, discussions, updateDiscussion } = useSession();
  return <>
    <button onClick={runComparison}>Test run comparison</button>
    <button onClick={() => setApprovalAge('59')}>Test fresh age</button>
    <button onClick={() => setCase('conflict')}>Test conflict case</button>
    <button onClick={() => setCase('context')}>Test context case</button>
    {(['normal', 'unauthorized', 'spending', 'replay', 'delegation', 'approval'] as const).map(id => <button key={id} onClick={() => setCase(id)}>Test {id} case</button>)}
    <button onClick={() => selectedRun && updateDiscussion(selectedRun.id, { recommendation: 'Obtain a new matching approval' })}>Test legacy recommendation</button>
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
    expect(screen.getByText('Purchase with current approval')).toBeTruthy();
    expect((screen.getByLabelText('Reason for this recommendation') as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Test select original' }));
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
    expect((screen.getByLabelText('Reason for this recommendation') as HTMLTextAreaElement).value).toContain('expired request');
    expect((screen.getByLabelText('Dissent or another interpretation') as HTMLTextAreaElement).value).toContain('quote accuracy');
  });

  it('requires an explicit clear action and retains the denied original after a recovery exploration', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Obtain a new matching approval' } });
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

  it('turns an information recommendation into a retained unresolved request without creating a recovery', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Gather more information' } });
    expect(screen.getByRole('heading', { name: 'Request the missing business evidence' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Inspect the related recorded evidence →' }).getAttribute('href')).toContain('story=stale');
    fireEvent.change(screen.getByLabelText('What remains unknown?'), { target: { value: 'Existing question about the supplier.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this evidence request to my position' }));
    const question = screen.getByLabelText('What remains unknown?') as HTMLTextAreaElement;
    expect(question.value).toContain('Existing question about the supplier.');
    expect(question.value).toContain('Who can confirm');
    fireEvent.click(screen.getByRole('button', { name: 'Add this evidence request to my position' }));
    expect(question.value.match(/Who can confirm/g)?.length).toBe(1);
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
    expect(screen.getByLabelText('Test runs').textContent).toBe('1');
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
  });

  it('attaches exact retained check evidence without overwriting notes or using dirty draft inputs', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Supporting evidence'), { target: { value: 'Existing independently supplied observation.' } });
    fireEvent.change(screen.getByLabelText('Reason for this recommendation'), { target: { value: 'Keep the request on hold.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for discussion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test fresh age' }));
    fireEvent.click(screen.getByRole('button', { name: 'Attach this comparison’s decisive check' }));
    const evidence = screen.getByLabelText('Supporting evidence') as HTMLTextAreaElement;
    expect(evidence.value).toContain('Existing independently supplied observation.');
    expect(evidence.value).toContain('comparison-1 (comparison-1-unused-nonce)');
    expect(evidence.value).toContain('Approval freshness: fail');
    expect(evidence.value).toContain('B allow; C deny');
    expect(evidence.value).toContain('not a recorded trial');
    expect(screen.getByLabelText('Test ready').textContent).toBe('draft');
    fireEvent.click(screen.getByRole('button', { name: 'Attach this comparison’s decisive check' }));
    expect(evidence.value.match(/Illustrative comparison comparison-1/g)?.length).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    expect((screen.getByLabelText('Supporting evidence') as HTMLTextAreaElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Attach this comparison’s decisive check' }));
    expect((screen.getByLabelText('Supporting evidence') as HTMLTextAreaElement).value).toContain('No C check failed');
    fireEvent.click(screen.getByRole('button', { name: 'Test select original' }));
    expect((screen.getByLabelText('Supporting evidence') as HTMLTextAreaElement).value).toContain('Existing independently supplied observation.');
  });

  it('requires the matching retained input for a recovery and offers no recovery at 59 seconds', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Obtain a new matching approval' } });
    fireEvent.click(screen.getByRole('button', { name: 'Test fresh age' }));
    expect((screen.getByRole('button', { name: 'Explore a fresh-approval request' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Use this comparison’s inputs' }));
    expect((screen.getByRole('button', { name: 'Explore a fresh-approval request' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Test fresh age' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    expect(screen.queryByRole('option', { name: 'Hold the purchase and obtain a new matching approval' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Verify business inputs' } });
    expect(screen.getByRole('heading', { name: 'Request the missing business evidence' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Test legacy recommendation' }));
    expect(screen.getByRole('option', { name: 'Saved recommendation: Obtain a new matching approval' })).toBeTruthy();
    expect(screen.getByText(/Its approval is already current/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
  });

  it('keeps policy proposals, missing evidence and dissent as distinct unresolved next steps', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Propose a policy revision' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add this policy-review question' }));
    expect((screen.getByLabelText('What remains unknown?') as HTMLTextAreaElement).value).toContain('fixed 60-second rule is unchanged');
    expect(screen.getByRole('link', { name: 'Inspect the relevant control and its limits →' }).getAttribute('href')).toContain('CTL-EXPIRY');
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Insufficient evidence' } });
    expect(screen.getByText(/Name the missing observation/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Unresolved disagreement' } });
    expect(screen.getByText(/Record the competing interpretation/)).toBeTruthy();
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
    expect(screen.getByLabelText('Test runs').textContent).toBe('1');
  });

  it('asks case-specific questions for objectives and task provenance without inventing resolution', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test conflict case' })); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Clarify competing objectives' } });
    expect(screen.getByRole('heading', { name: 'Ask what would make a trade-off acceptable' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add this evidence request to my position' }));
    expect((screen.getByLabelText('What remains unknown?') as HTMLTextAreaElement).value).toContain('Which objective takes priority');
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/review');
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Test context case' })); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Resolve task provenance' } });
    expect(screen.getByRole('heading', { name: 'Request evidence of task provenance' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Inspect the related recorded evidence →' }).getAttribute('href')).toContain('story=context');
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
  });

  it('does not show another comparison’s readiness feedback after changing runs', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Reason for this recommendation'), { target: { value: 'Hold this request.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready for discussion' }));
    expect(screen.getByText(/Position marked ready for discussion/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Test fresh age' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    expect(screen.queryByText(/Position marked ready for discussion/)).toBeNull();
    expect(screen.getByLabelText('Test ready').textContent).toBe('draft');
  });


  it('places the selected investigation immediately before the writing fields', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Gather more information' } });
    const next = screen.getByRole('region', { name: 'Request the missing business evidence' });
    const rationale = screen.getByLabelText('Reason for this recommendation');
    expect(next.compareDocumentPosition(rationale) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('Recommended next action').compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    ['normal', 'Verify business inputs', 'Request the missing business evidence', 'quotation, stock record'],
    ['unauthorized', 'Restore role boundaries', 'Investigate who may perform this operation', 'Which role should submit'],
    ['spending', 'Review the proposed amount', 'Investigate why the amount exceeds the ceiling', 'quantity and quotation'],
    ['replay', 'Reconcile the prior attempt', 'Reconcile what happened to the prior attempt', 'whether the original request already executed'],
    ['delegation', 'Inspect the delegation chain', 'Find why delegation did not terminate', 'Which worker owns completion'],
  ])('offers relevant next steps for the %s case without suggesting renewed approval', (id, recommendation, heading, question) => {
    setup(); fireEvent.click(screen.getByRole('button', { name: `Test ${id} case` })); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    const initialOutcome = screen.getByLabelText('Test outcome').textContent;
    expect(screen.queryByRole('option', { name: 'Hold the purchase and obtain a new matching approval' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: recommendation } });
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add this evidence request to my position' }));
    expect((screen.getByLabelText('What remains unknown?') as HTMLTextAreaElement).value).toContain(question);
    expect(screen.getByLabelText('Test outcome').textContent).toBe(initialOutcome);
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
  });

  it('still offers obtaining approval for a missing-approval request without inventing a modeled recovery', () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Test approval case' })); fireEvent.click(screen.getByRole('button', { name: 'Test run comparison' }));
    expect(screen.getByRole('option', { name: 'Hold the purchase and obtain a new matching approval' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Recommended next action'), { target: { value: 'Obtain a new matching approval' } });
    expect(screen.getByText(/This comparison has no modeled fresh-approval recovery branch/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Explore a fresh-approval request' })).toBeNull();
  });

});
