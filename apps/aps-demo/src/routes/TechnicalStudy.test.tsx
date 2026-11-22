// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TechnicalStudy } from './TechnicalStudy.tsx';

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function openExercise() {
  return render(<TechnicalStudy active/>);
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function begin() {
  const view = openExercise();
  click('Supply chain executive');
  click('Reveal the comparison');
  return view;
}

describe('archived purchasing exercise component', () => {
  it('opens the detailed exercise with its assumptions', () => {
    openExercise();
    expect(screen.getByRole('heading', { name: 'Should this site pilot a purchasing agent?' })).toBeTruthy();
    fireEvent.click(screen.getByText('Compare the options and costs'));
    expect(screen.getByText('Change the ERP rule')).toBeTruthy();
    expect(screen.getByText('$2,400 in year-one net value')).toBeTruthy();
    expect(screen.getByText('4.5 minutes per request')).toBeTruthy();
  });

  it('recalculates first-year capacity value and carries the assumption into the recommendation', () => {
    openExercise();
    fireEvent.click(screen.getByText('Compare the options and costs'));
    const label = 'Minutes saved per request';
    const output = () => screen.getByRole('status');
    expect(output().textContent).toContain('$2,400');
    change(label, '4.5');
    expect(output().textContent).toBe('Estimated first-year net capacity value: $0.');
    change(label, '');
    expect(output().textContent).toMatch(/Enter a nonnegative number/);
    change(label, '-1');
    expect(output().textContent).toMatch(/Enter a nonnegative number/);
    change(label, '3');
    expect(output().textContent).toContain('-$2,400');
    click('Supply chain executive');
    click('Reveal the comparison');
    click('Choose your decision');
    fireEvent.click(screen.getByText('Compare the options and costs'));
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('3');
    expect(output().textContent).toContain('-$2,400');
  });

  it.each([['Supply chain executive', 'pilot'], ['Site line manager', 'field'], ['Researcher or professor', 'research']])(
    'carries the %s role into the recommendation', (label, role) => {
      openExercise();
      click(label);
      click('Reveal the comparison');
      click('Choose your decision');
      expect((screen.getByLabelText('Choose your role') as HTMLSelectElement).value).toBe(role);
    },
  );

  it('binds the submitted executive recommendation to a valid cost assumption until revised', () => {
    begin();
    click('Choose your decision');
    fireEvent.click(screen.getByText('Compare the options and costs'));
    const minutes = 'Minutes saved per request';
    const recorded = () => screen.getByText('Assumption at submission').parentElement?.textContent;
    change('Sponsor decision', 'Keep the current workflow');
    change('Reason to keep the current workflow', 'An ERP recheck could suffice.');
    change('What would prompt reconsideration?', 'The measured time saving clears break-even.');
    change(minutes, '-1');
    expect((screen.getByRole('button', { name: 'Record decision' }) as HTMLButtonElement).disabled).toBe(true);
    change(minutes, '3');
    click('Record decision');
    expect(recorded()).toContain('3 minutes saved per request gives -$2,400');
    change(minutes, '');
    expect(recorded()).toContain('3 minutes saved per request gives -$2,400');
    change(minutes, '6');
    change('Choose your role', 'field');
    change('Choose your role', 'pilot');
    expect(recorded()).toContain('3 minutes saved per request gives -$2,400');
    click('Revise decision');
    click('Record decision');
    expect(recorded()).toContain('6 minutes saved per request gives $2,400');
  });

  it('keeps the result and audience choice behind reveal and evaluates the strict boundary', () => {
    openExercise();
    click('Site line manager');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'What could happen if release is late?' }));
    change('What could go stale while the request waits, and what do you predict will happen?', 'The quote might change.');
    expect(screen.queryByText(/REF-008/)).toBeNull();
    expect(screen.queryByText(/approval has expired/i)).toBeNull();
    expect(screen.queryByLabelText('Choose your role')).toBeNull();
    click('Reveal the comparison');
    const result = within(screen.getByRole('status'));
    expect(result.getByText('C holds.')).toBeTruthy();
    expect(result.getByText(/Finance approval has expired. The purchase is still outstanding/)).toBeTruthy();
    fireEvent.click(screen.getByText('What else needs checking?'));
    expect(screen.getByText(/quote could expire/)).toBeTruthy();
    click('59 seconds');
    expect(result.getByText('C releases.')).toBeTruthy();
    expect(result.getByText(/Finance approval is still current/)).toBeTruthy();
    click('60 seconds');
    expect(result.getByText('C holds.')).toBeTruthy();
    expect(result.getByText('B releases.')).toBeTruthy();
    fireEvent.click(screen.getByText('Timing data from this study'));
    const timing = within(screen.getByRole('table'));
    expect(timing.getAllByRole('row').slice(1).map(row => Array.from(row.children, cell => cell.textContent)))
      .toEqual([['59', '1', '1'], ['60', '1', '0'], ['61', '1', '0']]);
  });

  it('links the exact sources and keeps the detailed learner route reachable', () => {
    begin();
    fireEvent.click(screen.getByText('Sources and full workspace'));
    expect(screen.getByRole('link', { name: 'REF-008 source finding' }).getAttribute('href'))
      .toBe('#/hazop?hazard=APS-f47191931b96a999a61c');
    expect(screen.getByRole('link', { name: 'Approval freshness control' }).getAttribute('href'))
      .toBe('#/governance?control=CTL-EXPIRY');
    expect(screen.getAllByRole('link', { name: /^[BC] trial / }).map(link => link.getAttribute('href')))
      .toEqual(['#/assurance?trial=14', '#/assurance?trial=15']);
    expect(screen.getByRole('link', { name: 'Research, teaching and full downloads' }).getAttribute('href'))
      .toBe('#/simulator?story=stale&age=61&task=research');
  });

  it('keeps each role and fictional update attached to its original comparison and allows revision', () => {
    const view = begin();
    click('Choose your decision');
    change('Choose your role', 'field');
    change('Proposed disposition', 'Reconcile and propose closing the requisition');
    change('Evidence supporting the disposition', 'Inbound PO-417');
    change('Action owner', 'Materials planner');
    change('Deadline', 'Wednesday at 14:00');
    click('Record decision');
    expect(screen.getByText('Inbound PO-417')).toBeTruthy();

    change('Fictional purchasing update', 'shortage');
    expect(screen.getByText(/Quote Q-82/)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Decision recorded for discussion' })).toBeNull();
    change('Proposed disposition', 'Seek current authorization and recheck the quote');
    change('Choose your role', 'pilot');
    change('Sponsor decision', 'Sponsor a shadow pilot');
    change('Stop condition', 'Pause if an expired release is recommended.');
    change('Who can pause the pilot?', 'Controls lead');
    change('Reason for your recommendation', 'Collect buyer minutes for matched requisitions before committing setup funds.');
    click('Record decision');

    change('Choose your role', 'research');
    expect(screen.queryByRole('button', { name: 'Record decision' })).toBeNull();
    click('Test 59 seconds');
    expect(screen.queryByRole('button', { name: 'Record decision' })).toBeNull();
    click('Test 60 seconds');
    change('Explain the 59/60-second boundary in your own words', 'C holds at exactly 60 while B releases at both ages.');
    change('One limit or field observation to collect', 'Measure release and approval timestamps.');
    change('Which pilot assumption should students challenge, and how?', 'Count the time spent handling holds in both workflows.');
    click('Record decision');
    expect(screen.getByText('Measure release and approval timestamps.')).toBeTruthy();
    click('Revise decision');
    expect((screen.getByLabelText('One limit or field observation to collect') as HTMLInputElement).value).toBe('Measure release and approval timestamps.');

    change('Choose your role', 'field');
    expect((screen.getByLabelText('Proposed disposition') as HTMLSelectElement).value).toBe('Seek current authorization and recheck the quote');
    change('Fictional purchasing update', 'inbound');
    expect(screen.getByText('Materials planner')).toBeTruthy();

    click('Back to comparison');
    click('60 seconds');
    click('59 seconds');
    click('Choose your decision');
    expect(screen.getByText(/Decision basis · 59 logical seconds · B released, C released/)).toBeTruthy();
    expect(screen.getByText(/This exercise starts from a run where C held the order/)).toBeTruthy();
    expect(screen.queryByLabelText('Fictional purchasing update')).toBeNull();
    expect(screen.queryByLabelText('Proposed disposition')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Record decision' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Decision recorded for discussion' })).toBeNull();

    click('Return to the 60-second hold');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Make one decision' }));
    expect(screen.getByText(/Decision basis · 60 logical seconds · B released, C held/)).toBeTruthy();
    expect(screen.queryByText('Materials planner')).toBeNull();
    expect(screen.getByLabelText('Proposed disposition')).toBeTruthy();

    click('Back to comparison');
    click('59 seconds');
    click('Choose your decision');
    click('Return to the 61-second hold');
    expect(screen.getByText(/Decision basis · 61 logical seconds · B released, C held/)).toBeTruthy();
    expect(screen.getByText('Materials planner')).toBeTruthy();
    change('Choose your role', 'pilot');
    expect(screen.getByText('Controls lead')).toBeTruthy();

    view.rerender(<TechnicalStudy active={false}/>);
    expect(screen.queryByText('Should this site pilot a purchasing agent?')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Make one decision' })).toBeNull();
    view.rerender(<TechnicalStudy active/>);
    expect(screen.getByText('Controls lead')).toBeTruthy();
  });
  it('preserves the rationale, decision criteria and owners for each funding choice', () => {
    begin();
    click('Choose your decision');
    change('Choose your role', 'pilot');
    change('Sponsor decision', 'Sponsor a shadow pilot');
    change('Stop condition', 'Pause if approval was expired.');
    change('Who can pause the pilot?', 'Finance director');
    change('Reason for your recommendation', 'Test whether buyers can reuse the time saved.');
    change('Sponsor decision', 'Defer pending evidence');
    expect(screen.queryByLabelText('Stop condition')).toBeNull();
    const missing = screen.getByLabelText('Missing evidence') as HTMLInputElement;
    expect(missing.value).toBe('');
    change('Missing evidence', 'Count delayed releases.');
    change('Who will collect it?', 'Procurement analyst');
    change('Reason for your recommendation', 'The delivery impact is unknown.');
    change('Sponsor decision', 'Test the ERP rule first');
    change('Who will test the rule?', 'ERP owner');
    change('What result would justify keeping it?', 'Fewer stale releases with similar delivery performance.');
    change('Reason for your recommendation', 'A rules change could cost less.');
    click('Record decision');
    expect(screen.getByText('ERP owner')).toBeTruthy();
    click('Revise decision');
    change('Sponsor decision', 'Keep the current workflow');
    expect((screen.getByLabelText('Reason to keep the current workflow') as HTMLInputElement).value).toBe('');
    change('Reason to keep the current workflow', 'ERP already holds expired approvals.');
    change('What would prompt reconsideration?', '   ');
    click('Record decision');
    expect(screen.queryByText('Decision recorded for discussion')).toBeNull();
    change('What would prompt reconsideration?', 'Review if exceptions double.');
    click('Record decision');
    expect(screen.getByText('ERP already holds expired approvals.')).toBeTruthy();
    expect(screen.queryByText('Procurement analyst')).toBeNull();
    click('Revise decision');
    change('Sponsor decision', 'Defer pending evidence');
    expect((screen.getByLabelText('Who will collect it?') as HTMLInputElement).value).toBe('Procurement analyst');
    click('Record decision');
    expect(screen.getByText('Count delayed releases.')).toBeTruthy();
    expect(screen.queryByText('Finance director')).toBeNull();
    click('Revise decision');
    change('Sponsor decision', 'Sponsor a shadow pilot');
    expect((screen.getByLabelText('Who can pause the pilot?') as HTMLInputElement).value).toBe('Finance director');
    click('Record decision');
    expect(screen.getByText('Stop condition')).toBeTruthy();
    expect(screen.queryByText('Count delayed releases.')).toBeNull();
  });

  it.each([59, 60])('reuses the existing %i-second observation and retains the paired interpretation on revisit', first => {
    const view = begin();
    click(first + ' seconds');
    click('Choose your decision');
    change('Choose your role', 'research');
    const missing = first === 59 ? 60 : 59;
    expect(screen.queryByLabelText('Explain the 59/60-second boundary in your own words')).toBeNull();
    click('Test ' + missing + ' seconds');
    const table = within(screen.getByRole('table', { name: 'Observed decisions for the same request' }));
    expect(table.getAllByRole('row').slice(1).map(row => Array.from(row.children, cell => cell.textContent)))
      .toEqual([['59 seconds', 'Released', 'Released'], ['60 seconds', 'Released', 'Held']]);
    const question = 'Explain the 59/60-second boundary in your own words';
    expect(document.activeElement).toBe(screen.getByLabelText(question));
    change(question, 'B releases at both ages; C holds when approval reaches 60.');
    click('Record decision');
    expect(screen.queryByText('Decision recorded for discussion')).toBeNull();
    change('One limit or field observation to collect', 'Measure actual authorization age at release.');
    change('Which pilot assumption should students challenge, and how?', 'Compare buyer time saved with the 4.5-minute threshold.');
    click('Record decision');
    click('Back to comparison');
    click('61 seconds');
    click('Choose your decision');
    view.rerender(<TechnicalStudy active={false}/>);
    view.rerender(<TechnicalStudy active/>);
    expect(screen.getByText('Measure actual authorization age at release.')).toBeTruthy();
    expect(screen.getByText('B releases at both ages; C holds when approval reaches 60.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Test 59 seconds' })).toBeNull();
  });

  it('copies only the active recorded handoff, and offers the same selectable text if clipboard access fails', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'navigator', 'get').mockReturnValue(Object.assign(Object.create(window.navigator), { clipboard: { writeText: write } }));
    try {
      begin();
      click('Choose your decision');
      change('Choose your role', 'field');
      expect(screen.queryByRole('button', { name: 'Copy handoff' })).toBeNull();
      change('Proposed disposition', 'Reconcile and propose closing the requisition');
      change('Evidence supporting the disposition', 'Confirmed inbound and reserved stock.');
      change('Action owner', 'Receiving lead');
      change('Deadline', 'Wednesday 14:00');
      click('Record decision');
      click('Copy handoff');
      await screen.findByText('Handoff copied.');
      const inbound = write.mock.calls[0][0];
      for (const value of ['REQ-218', 'PO-417', 'Wednesday inbound confirmed', 'lane C', '61 logical seconds', 'No order', 'Receiving lead', 'Wednesday 14:00', 'Confirmed inbound and reserved stock.', 'discussion']) {
        expect(inbound.toLowerCase()).toContain(value.toLowerCase());
      }
      expect(inbound).not.toContain('Q-82');
      change('Fictional purchasing update', 'shortage');
      expect(screen.queryByText('Handoff copied.')).toBeNull();
      change('Proposed disposition', 'Seek current authorization and recheck the quote');
      change('Evidence supporting the disposition', 'Demand remains uncovered.');
      change('Action owner', 'Buyer');
      change('Deadline', 'Tuesday 13:30');
      click('Record decision');
      write.mockRejectedValueOnce(new Error('NotAllowedError'));
      click('Copy handoff');
      const manual = await screen.findByRole('textbox', { name: 'Handoff text' }) as HTMLTextAreaElement;
      expect(manual.value).toBe(write.mock.calls[1][0]);
      expect(manual.value).toContain('Q-82');
      expect(manual.value).not.toContain('PO-417');
      expect(manual.value).toContain('Buyer');
      expect(manual.readOnly).toBe(true);
      expect(manual.selectionStart).toBe(0);
      expect(manual.selectionEnd).toBe(manual.value.length);
      click('Revise decision');
      change('Deadline', 'Tuesday 13:00');
      click('Record decision');
      click('Copy handoff');
      await screen.findByText('Handoff copied.');
      expect(write.mock.calls[2][0]).toContain('Tuesday 13:00');
      expect(write.mock.calls[2][0]).not.toContain('Tuesday 13:30');
    } finally { vi.restoreAllMocks(); }
  });

});
