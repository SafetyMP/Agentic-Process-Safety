// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App.tsx';

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function navigate(path: string) {
  act(() => {
    window.history.replaceState(null, '', path);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function begin() {
  navigate('/index.html#/study');
  render(<App/>);
  click('Apply HAZOP at purchase');
  click('Reveal the comparison');
}

describe('short purchasing study', () => {
  it.each(['/', '/index.html', '/index.html#/study'])('opens the walkthrough at %s', path => {
    navigate(path);
    render(<App/>);
    expect(screen.getByRole('heading', { name: 'Can this purchase go ahead?' })).toBeTruthy();
    expect(document.title).toBe('Short study | Agentic Process Safety');
    expect(screen.getByRole('link', { name: 'Short study' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Start here' }).getAttribute('href')).toBe('#/overview');
    expect(screen.getByRole('link', { name: 'Case Lab' }).getAttribute('href')).toBe('#/simulator');
  });

  it('keeps the result and audience choice behind reveal and evaluates the strict boundary', () => {
    navigate('/');
    render(<App/>);
    click('Apply HAZOP at purchase');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'What could happen if release is late?' }));
    change('What could go stale while the request waits, and what do you predict will happen?', 'The quote might change.');
    expect(screen.queryByText(/REF-008/)).toBeNull();
    expect(screen.queryByText(/approval has expired/i)).toBeNull();
    expect(screen.queryByLabelText('Choose your role')).toBeNull();
    click('Reveal the comparison');
    const result = within(screen.getByRole('status'));
    expect(result.getByText('C holds.')).toBeTruthy();
    expect(result.getByText(/Finance approval has expired. The purchase is still outstanding/)).toBeTruthy();
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
    navigate('/index.html#/simulator?task=learner');
    expect(screen.getByRole('heading', { name: 'Predict the purchase decision' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download blank learner sheet' })).toBeTruthy();
  });

  it('keeps each role and fictional update attached to its original comparison and allows revision', () => {
    begin();
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
    change('Stop condition and who can pause the pilot', 'Controls lead pauses if an expired release is recommended.');
    click('Record decision');

    change('Choose your role', 'research');
    change('Interpretation of the boundary', 'Evidence of a modeled finance-approval boundary');
    change('One limit or field observation to collect', 'Measure release and approval timestamps.');
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
    expect(screen.getByText('Controls lead pauses if an expired release is recommended.')).toBeTruthy();

    navigate('/index.html#/overview');
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(screen.queryByText('Can this purchase go ahead?')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Make one decision' })).toBeNull();
    navigate('/index.html#/study');
    expect(screen.getByText('Controls lead pauses if an expired release is recommended.')).toBeTruthy();
  });
});
