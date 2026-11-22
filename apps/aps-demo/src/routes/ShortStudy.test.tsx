// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShortStudy as Case } from './ShortStudy.tsx';
import { useBearingsSelection } from '../components/useBearingsSelection.ts';

function ShortStudy() {
  const order = useBearingsSelection();
  return <Case order={order}/>;
}

afterEach(cleanup);

function choose(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('interactive purchasing case', () => {
  it('keeps the opening request and a common decision visible without selecting a role', () => {
    render(<ShortStudy/>);
    const story = screen.getByRole('article', { name: 'The bearings are due Thursday.' });
    expect(within(story).getAllByRole('heading', { level: 2 }).map(item => item.id)).toEqual(['case-workflow', 'case-problem', 'case-hazop', 'case-evidence', 'case-decision', 'case-choice']);
    expect(within(story).getByText('24 bearings')).toBeTruthy();
    expect(within(story).getByText('300 simulated spend units')).toBeTruthy();
    expect(within(story).getByRole('link', { name: 'See how to implement the check' }).getAttribute('href')).toBe('#/overview?age=60&quote=13%3A55&stock=unknown&trial=15');
  });

  it('establishes the buyer-led workflow and the site baseline before asking readers to test a control', () => {
    render(<ShortStudy/>);
    const workflow = within(screen.getByRole('region', { name: 'How the bearings reach the line' }));
    expect(workflow.getAllByRole('listitem')).toHaveLength(4);
    const problem = within(screen.getByRole('region', { name: 'What changes while the request waits?' }));
    expect(problem.getByText('If the order goes out')).toBeTruthy();
    expect(problem.getByText('If the order waits')).toBeTruthy();
    expect(problem.getByText(/Match attempted releases to approval expiry times/)).toBeTruthy();
    expect(problem.queryByRole('button', { name: '60 seconds' })).toBeNull();
  });

  it('keeps the illustrative stock record independent of the purchase decision', () => {
    render(<ShortStudy/>);
    const problem = within(screen.getByRole('region', { name: 'What changes while the request waits?' }));
    const result = problem.getByRole('status');
    expect(result.textContent).toContain('Availability unknown');
    choose('24 bearings available');
    choose('61 seconds');
    expect(result.textContent).toContain('24 of 24');
    choose('No bearings available');
    expect(result.textContent).toContain('0 of 24');
    expect(screen.getByRole('button', { name: '61 seconds' }).getAttribute('aria-pressed')).toBe('true');
    choose('No bearings available');
    expect(result.textContent).toContain('Availability unknown');
  });

  it('updates both release paths and their handoff at the exact expiry boundary', () => {
    render(<ShortStudy/>);
    const outcomes = () => Array.from(document.querySelectorAll('.release-lanes dd'), item => item.textContent);
    expect(outcomes()).toEqual(['Release', 'Hold']);
    choose('59 seconds');
    expect(outcomes()).toEqual(['Release', 'Release']);
    expect(screen.getByText('Approval is current')).toBeTruthy();
    for (const age of [60, 61]) {
      choose(age + ' seconds');
      expect(outcomes()).toEqual(['Release', 'Hold']);
      expect(screen.getByText('Approval has expired')).toBeTruthy();
      expect(screen.getByRole('button', { name: age + ' seconds' }).getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('carries the cutoff, finance result and receiving record through the same requisition', () => {
    render(<ShortStudy/>);
    const exhibit = screen.getByRole('region', { name: 'One second changes the order' });
    const buyer = within(exhibit).getByRole('region', { name: 'Buyer handoff for REQ-218' });
    choose('Tuesday 14:05');
    choose('59 seconds');
    choose('24 bearings available');
    expect(exhibit.textContent).toContain('REQ-218 at release · Tuesday 14:05');
    expect(exhibit.textContent).toContain('Both models release the purchase on fresh finance approval even though Q-82 has expired');
    expect(buyer.textContent).toContain('Get updated terms');
    expect(buyer.textContent).toContain('24 of 24');
    choose('Tuesday 13:55');
    choose('60 seconds');
    expect(exhibit.textContent).toContain('Q-82 is current');
    expect(exhibit.textContent).toContain('APS catches the expired finance approval');
    expect(buyer.textContent).toContain('seeking fresh authority');
    expect(buyer.textContent).toContain('24 of 24');
  });

  it('keeps the order work separate from the monthly mix and updates an already selected decision', () => {
    render(<ShortStudy/>);
    const ledger = document.querySelector('.order-time')!;
    const decision = document.querySelector('.decision-record')!;
    choose('Run a shadow pilot');
    expect(ledger.textContent).toContain('12 − 2 − 7 = 3 min');
    choose('59 seconds');
    choose('Tuesday 14:05');
    choose('No bearings available');
    expect(ledger.textContent).toContain('12 − 2 − 4 = 6 min');
    expect(decision.textContent).toContain('REQ-218 · Released');
    expect(decision.textContent).toContain('Q-82 expired');
    expect(decision.textContent).toContain('0 of 24');
    expect(decision.textContent).toContain('50% held');
    expect(screen.getByText(/Your time assumption gives \$0/)).toBeTruthy();
    choose('3 minutes saved');
    expect(ledger.textContent).toContain('12 − 2 − 4 = 6 min');
    expect(decision.textContent).toContain('100% held');
    expect(screen.getByText(/Your time assumption gives −\$2,400/)).toBeTruthy();
    choose('60 seconds');
    expect(ledger.textContent).toContain('12 − 2 − 7 = 3 min');
    expect(decision.textContent).toContain('REQ-218 · Held');
    expect(screen.getByText(/held orders like REQ-218/)).toBeTruthy();
  });

  it('recalculates the value chart and carries the active assumption into the pilot assessment', () => {
    render(<ShortStudy/>);
    choose('Run a shadow pilot');
    expect(screen.getByText(/Your time assumption gives \$0/)).toBeTruthy();
    choose('3 minutes saved');
    expect(screen.getByText(/Your time assumption gives −\$2,400/)).toBeTruthy();
    expect(screen.getByText(/frees 10 buyer hours/)).toBeTruthy();
    choose('6 minutes saved');
    expect(screen.getByText(/Your time assumption gives \+\$2,400/)).toBeTruthy();
    expect(screen.getByText(/frees 20 buyer hours/)).toBeTruthy();
    choose('4.5 minutes saved');
    expect(screen.getByText(/frees 15 buyer hours/)).toBeTruthy();
  });

  it('provides a distinct next step for each reversible decision', () => {
    render(<ShortStudy/>);
    choose('Add the approval check');
    expect(screen.getByText(/route each hold to a named buyer/)).toBeTruthy();
    choose('Keep buyer-led purchasing');
    expect(screen.getByText(/Ask a buyer to check authority/)).toBeTruthy();
    expect(screen.queryByText(/route each hold to a named buyer/)).toBeNull();
    choose('Run a shadow pilot');
    expect(screen.getByText(/buyers keep authority/)).toBeTruthy();
  });
});
