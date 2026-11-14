// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Recharts from 'recharts';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CaseEvidenceBridge } from './CaseEvidenceBridge.tsx';
import { EvidenceComparison } from './EvidenceComparison.tsx';
import { SessionProvider, useSession } from './SessionContext.tsx';
import { Hazop } from '../routes/Hazop.tsx';
import { Assurance } from '../routes/Assurance.tsx';
import { Governance } from '../routes/Governance.tsx';
import { getCase } from '../domain/cases.ts';
import { experiment } from '../data.ts';

vi.mock('recharts', async importOriginal => ({ ...await importOriginal<typeof Recharts>(), ResponsiveContainer: () => null }));

function EvidenceSessionControls() {
  const { runComparison, setApprovalAge, selectedRun, discussions, updateDiscussion } = useSession();
  const discussion = selectedRun && discussions[selectedRun.id];
  return <>
    <button onClick={runComparison}>Test evaluate</button>
    <button onClick={() => setApprovalAge('59')}>Test edit age</button>
    <button onClick={() => selectedRun && updateDiscussion(selectedRun.id, { evidence: 'Original evidence note.', rationale: 'Keep the expired request stopped.', ready: true })}>Test existing position</button>
    <output aria-label="Test evidence">{discussion && discussion.evidence}</output>
    <output aria-label="Test ready">{discussion && discussion.ready ? 'ready' : 'draft'}</output>
    <output aria-label="Test outcome">{selectedRun ? `${selectedRun.results.B.decision}/${selectedRun.results.C.decision}` : 'none'}</output>
  </>;
}

afterEach(() => { cleanup(); window.location.hash = ''; });

describe('supporting sources preserve the investigation question', () => {
  it('explains approval freshness versus quotation validity before the source finding', () => {
    render(<SessionProvider><Hazop params={new URLSearchParams()}/></SessionProvider>);
    const bridge = screen.getByRole('region', { name: 'How this source relates to your case' });
    const finding = screen.getByRole('region', { name: 'purchase: late' });
    expect(bridge.compareDocumentPosition(finding) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(bridge).getByText(/Approval freshness does not establish quotation validity/)).toBeTruthy();
    expect(within(bridge).getByRole('link', { name: 'Return to your reasoning →' }).getAttribute('href')).toBe('#/simulator?panel=discussion');
    expect(screen.getByText('Search and browse all 96 findings').closest('details')?.hasAttribute('open')).toBe(false);
    fireEvent.click(screen.getByText('Search and browse all 96 findings'));
    const register = screen.getByRole('table', { name: 'Generated hazards, all unverified with null ratings' });
    expect(within(register).getAllByRole('row')).toHaveLength(97);
    fireEvent.change(screen.getByLabelText('Search findings'), { target: { value: 'an impossible unmatched search' } });
    expect(screen.getByText(/No findings match/)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'purchase: late' })).toBeTruthy();
  });

  it('does not present an unrelated selected hazard as the active case mapping', () => {
    render(<SessionProvider><Hazop params={new URLSearchParams('hazard=APS-00be5560043a77ba3ede')}/></SessionProvider>);
    const bridge = screen.getByRole('region', { name: 'How this source relates to your case' });
    expect(within(bridge).getByRole('heading', { name: 'A different source is under inspection' })).toBeTruthy();
    expect(within(bridge).getByText(/not the mapped source for your active case/)).toBeTruthy();
    expect(within(bridge).queryByText('Browser question')).toBeNull();
  });

  it('does not relabel an unrelated inspected control as approval-expiry evidence', () => {
    render(<SessionProvider><Governance params={new URLSearchParams('control=CTL-CONTEXT')}/></SessionProvider>);
    const bridge = screen.getByRole('region', { name: 'How this source relates to your case' });
    expect(within(bridge).getByRole('heading', { name: 'A different source is under inspection' })).toBeTruthy();
    expect(within(bridge).getByText(/Purchase after approval expiry/)).toBeTruthy();
    expect(within(bridge).queryByText(/recorded context substitution/)).toBeNull();
  });

  it('makes the recorded demand-stage context distinction explicit', () => {
    render(<CaseEvidenceBridge activeCase={getCase('context')} kind="recorded" matches sourceLabel="Trial #18 · message_poisoning"/>);
    expect(screen.getByText(/recorded context substitution occurs at demand_mock; the browser illustration evaluates a purchase request/)).toBeTruthy();
    expect(screen.getByText(/Related stages are not the same execution/)).toBeTruthy();
  });

  it('does not turn a recorded budget violation into resolved objective arbitration', () => {
    render(<CaseEvidenceBridge activeCase={getCase('conflict')} kind="recorded" matches sourceLabel="Trial #9 · goal_conflict"/>);
    expect(screen.getByText(/recorded goal-conflict case measures a budget violation, not objective arbitration/)).toBeTruthy();
    expect(screen.getByText(/Requesting review does not resolve the conflict/)).toBeTruthy();
  });
});

describe('recorded comparisons foreground the actual divergent call', () => {
  it('shows the purchase event first and retains every original paired call behind disclosure', () => {
    const trial = experiment.trials.find(row => row.sequence === 15)!;
    render(<EvidenceComparison trial={trial}/>);
    const decisive = screen.getByRole('region', { name: 'Decisive recorded event' });
    expect(within(decisive).getByText(/Paired step 10:/)).toBeTruthy();
    expect(within(decisive).getByText('purchase → purchase_mock')).toBeTruthy();
    const event = within(decisive).getByRole('table', { name: 'Decisive recorded B/C event' });
    expect(within(event).getByText('ALLOW · executed')).toBeTruthy();
    expect(within(event).getByText('DENY · not executed')).toBeTruthy();
    expect(within(event).getAllByText('Input violations: expired_finance_approval')).toHaveLength(2);
    expect(screen.getByText('Inspect all 10 paired recorded steps').closest('details')?.hasAttribute('open')).toBe(false);
    fireEvent.click(screen.getByText('Inspect all 10 paired recorded steps'));
    const full = screen.getByRole('table', { name: /Recorded B\/C calls/ });
    expect(within(full).getAllByRole('row')).toHaveLength(11);
    expect(within(full).getByText('demand_mock')).toBeTruthy();
    expect(within(full).getByText('finance_mock')).toBeTruthy();
    expect(within(full).getByText('purchase_mock')).toBeTruthy();
    expect(screen.getByText(/B #14 and C #15 share the recorded case identity and digest/)).toBeTruthy();
  });

  it('does not invent a decisive difference for equal benign outcomes', () => {
    render(<EvidenceComparison trial={experiment.trials.find(row => row.sequence === 3)!}/>);
    expect(screen.queryByRole('region', { name: 'Decisive recorded event' })).toBeNull();
    expect(screen.getByText('No difference in recorded decisions or execution flags between these paired calls.')).toBeTruthy();
  });

  it('does not pair records from another case identity or digest', () => {
    const original = experiment.trials.find(row => row.sequence === 15)!;
    render(<EvidenceComparison trial={{ ...original, case_digest: 'unmatched-digest' }}/>);
    expect(screen.getByText('A complete recorded B/C comparison is unavailable.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Decisive recorded event' })).toBeNull();
    expect(screen.queryByText('ALLOW · executed')).toBeNull();
  });
});


describe('recorded evidence can inform a retained human position', () => {
  it('attaches the exact related event without replacing notes or changing the modeled result', () => {
    const trial = experiment.trials.find(row => row.sequence === 15)!;
    render(<SessionProvider><EvidenceSessionControls/><Assurance params={new URLSearchParams('trial=15')}/></SessionProvider>);
    expect(screen.queryByRole('button', { name: 'Attach this recorded event to your reasoning' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Test evaluate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test existing position' }));
    expect(screen.getByLabelText('Test ready').textContent).toBe('ready');
    fireEvent.click(screen.getByRole('button', { name: 'Attach this recorded event to your reasoning' }));
    const evidence = screen.getByLabelText('Test evidence').textContent!;
    expect(evidence).toContain('Original evidence note.');
    expect(evidence).toContain('Related recorded evidence, not this browser execution');
    expect(evidence).toContain(`case ${trial.case_id}, digest ${trial.case_digest}`);
    expect(evidence).toContain('B trial #14 / C trial #15');
    expect(evidence).toContain('purchase → purchase_mock. B: allow, executed; C: deny, not executed');
    expect(screen.getByLabelText('Test ready').textContent).toBe('draft');
    expect(screen.getByLabelText('Test outcome').textContent).toBe('allow/deny');
    fireEvent.click(screen.getByRole('button', { name: 'Attach this recorded event to your reasoning' }));
    expect(screen.getByLabelText('Test evidence').textContent).toBe(evidence);
    fireEvent.click(screen.getByRole('button', { name: 'Test edit age' }));
    expect(screen.queryByRole('button', { name: 'Attach this recorded event to your reasoning' })).toBeNull();
    expect(screen.getByLabelText('Test evidence').textContent).toBe(evidence);
  });

  it('does not offer an unrelated recorded event as evidence for the selected case', () => {
    render(<SessionProvider><EvidenceSessionControls/><Assurance params={new URLSearchParams('trial=18')}/></SessionProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Test evaluate' }));
    expect(screen.getByRole('region', { name: 'Decisive recorded event' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'A different source is under inspection' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Attach this recorded event to your reasoning' })).toBeNull();
    expect(screen.getByLabelText('Test evidence').textContent).toBe('');
  });
});
