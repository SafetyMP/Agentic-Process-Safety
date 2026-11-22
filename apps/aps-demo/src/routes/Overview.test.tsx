// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { Overview } from './Overview.tsx';
import { expiryTrials } from '../domain/replication.ts';
import { timingRuns, defaultWorkspace, type BearingsSelection } from '../domain/workspaceLink.ts';
import { quoteAttempts } from '../domain/audience.ts';

function TrialView({ order = defaultWorkspace }: { order?: BearingsSelection }) {
  const [trial, setTrial] = useState(order.trial);
  return <Overview order={{ ...order, trial }} onTrialChange={setTrial}/>;
}

afterEach(cleanup);

it('uses the observed call and record for the selected trial', () => {
  render(<TrialView/>);
  const evidence = within(screen.getByRole('region', { name: 'Inspect the recorded purchase calls' }));
  expect(evidence.getByRole('button', { name: 'C · Trial 15', pressed: true })).toBeTruthy();
  fireEvent.click(evidence.getByText('Inspect record identifiers'));
  for (const trial of expiryTrials) {
    fireEvent.click(evidence.getByRole('button', { name: `${trial.configuration} · Trial ${trial.sequence}` }));
    const call = trial.calls.find(c => c.action === 'purchase_mock')!;
    expect(evidence.getByText('Decision', { selector: 'dt' }).nextElementSibling?.textContent).toBe(call.decision);
    expect(evidence.getByText('Adapter executed', { selector: 'dt' }).nextElementSibling?.textContent).toBe(String(call.executed));
    expect(evidence.getByText(trial.hash)).toBeTruthy();
    expect(evidence.getByText(trial.case_digest)).toBeTruthy();
    expect(trial.requirement_links.some(r => r.controls.some(c => c.id === 'CTL-EXPIRY'))).toBe(true);
  }
});

it('shows the checked-in policy predicate and every required request field', () => {
  render(<TrialView/>);
  const contract = screen.getByText('Inspect the request and policy contract').closest('details')!;
  fireEvent.click(within(contract).getByText('Inspect the request and policy contract'));
  const [body, rule] = Array.from(contract.querySelectorAll('pre code'), code => code.textContent!);
  const root = resolve(process.cwd(), '../..');
  const schema = JSON.parse(readFileSync(resolve(root, 'schemas/governance-request.schema.json'), 'utf8'));
  const request = JSON.parse(body);
  expect(Object.keys(request).sort()).toEqual(schema.required.toSorted());
  expect(Object.keys(request.payload).sort()).toEqual(schema.properties.payload.required.toSorted());
  expect(readFileSync(resolve(root, 'policies/v1/procurement.rego'), 'utf8').split('\n')).toContain(rule);
});

it('uses the selected run for the receipt and keeps the recorded trial independent', () => {
  const view = render(<TrialView/>);
  fireEvent.click(screen.getByRole('button', { name: 'B · Trial 14' }));
  for (const run of timingRuns) {
    view.rerender(<TrialView order={{ ...defaultWorkspace, run, available: 0, quoteAttempt: quoteAttempts[1] }}/>);
    const trace = screen.getByRole('region', { name: 'Trace REQ-218 through APS' });
    const receipt = JSON.parse(trace.querySelector('.selected-receipt')!.textContent!);
    expect(receipt).toEqual({
      task_id: 'REQ-218', action: 'purchase_mock', decision: run.results.C.decision,
      executed: run.results.C.executed, cached: false,
      reason: run.request.approvalAge === 59 ? 'policy_allow' : 'approval_invalid',
    });
    expect(trace.textContent).toContain('Q-82 is expired');
    expect(trace.textContent).toContain('0 of 24');
    const table = screen.getByRole('table', { name: 'REQ-218 compared with trial 14' });
    const ages = within(table).getByRole('rowheader', { name: 'Approval age' }).closest('tr')!;
    expect(within(ages).getAllByRole('cell').map(cell => cell.textContent)).toEqual([run.request.approvalAge + ' seconds', '61 seconds']);
  }
});
