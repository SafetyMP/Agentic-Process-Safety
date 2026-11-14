// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AudienceProvider } from './AudienceView.tsx';
import { WorkflowStage } from './WorkflowStage.tsx';
import { createWorkflow, exportWorkflow, importWorkflow, scenarioSpec, workflowReducer } from '../workflow/index.ts';
import { advanceToDecision } from '../workflow/advance.ts';
import type { ScenarioId } from '../workflow/index.ts';

function Harness({ scenario = 'nominal' }: { scenario?: ScenarioId }) {
  const [state, setState] = useState(() => createWorkflow(scenarioSpec(scenario)));
  return <AudienceProvider><WorkflowStage wholeExperience state={state}
    onAdvance={() => setState(current => advanceToDecision(current))}
    onCommand={command => setState(current => workflowReducer(current, command))}
    onExport={() => exportWorkflow(state)} onImport={text => {
      const imported = importWorkflow(text);
      if (!imported.ok) return { ok: false, message: imported.message };
      setState(imported.state); return { ok: true, message: 'Replay imported' };
    }}/></AudienceProvider>;
}
afterEach(cleanup);

describe('workflow setup and decision continuity', () => {
  it('closes old purchasing review state when a new run reuses the same specification', () => {
    const state = createWorkflow(scenarioSpec());
    const props = { state, onCommand: () => {}, onExport: () => '', onImport: () => ({ ok: false, message: 'Not imported' }) };
    const view = render(<AudienceProvider><WorkflowStage wholeExperience runId="first-run" {...props}/></AudienceProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Review operation design' }));
    expect(screen.getByRole('button', { name: 'Return to the business case' })).toBeTruthy();
    view.rerender(<AudienceProvider><WorkflowStage wholeExperience runId="second-run" {...props}/></AudienceProvider>);
    expect(screen.queryByRole('button', { name: 'Return to the business case' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Review operation design' })).toBeTruthy();
  });

  it('prepares a paused example and advances only to an explicit permission decision', () => {
    render(<Harness/>);
    fireEvent.change(screen.getByLabelText('Question to examine'), { target: { value: 'approval-delay' } });
    expect(screen.getByRole('status', { name: 'Example setup status' }).textContent).toContain('Pending setup changes');
    fireEvent.click(screen.getByRole('button', { name: 'Prepare example' }));
    expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('ready · paused');
    fireEvent.click(screen.getByRole('button', { name: 'Advance to next decision' }));
    expect(screen.getByRole('region', { name: 'Approval refresh decision' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Advance to next decision' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Request one approval refresh' })).toBeTruthy();
  });

  it('restores setup selectors from an imported run and retains exact technical stepping', () => {
    render(<Harness/>);
    fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
    const imported = createWorkflow(scenarioSpec('lost-purchase-response', 'B', 'proposal-2-first'));
    fireEvent.change(screen.getByLabelText('Replay JSON to validate'), { target: { value: exportWorkflow(imported) } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
    expect((screen.getByLabelText('Workflow scenario') as HTMLSelectElement).value).toBe('lost-purchase-response');
    expect((screen.getByLabelText('Workflow comparator') as HTMLSelectElement).value).toBe('B');
    expect((screen.getByLabelText('Proposal schedule') as HTMLSelectElement).value).toBe('proposal-2-first');
    fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
    expect(screen.getByRole('status', { name: 'Workflow status' }).textContent).toContain('1 transitions');
  });

  it('synchronizes imported identical setup even if unapplied selector changes existed', () => {
    render(<Harness/>);
    fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
    fireEvent.change(screen.getByLabelText('Workflow scenario'), { target: { value: 'purchase-race' } });
    fireEvent.change(screen.getByLabelText('Replay JSON to validate'), { target: { value: exportWorkflow(createWorkflow(scenarioSpec())) } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
    expect((screen.getByLabelText('Workflow scenario') as HTMLSelectElement).value).toBe('nominal');
    expect(screen.getByRole('status', { name: 'Example setup status' }).textContent).toContain('match the active setup');
  });

  it('does not discard pending choices when the existing run steps or import fails', () => {
    render(<Harness/>);
    fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
    fireEvent.change(screen.getByLabelText('Workflow scenario'), { target: { value: 'purchase-race' } });
    fireEvent.click(screen.getByRole('button', { name: 'Step one transition' }));
    fireEvent.change(screen.getByLabelText('Replay JSON to validate'), { target: { value: '{}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Validate replay and replace current run' }));
    expect((screen.getByLabelText('Workflow scenario') as HTMLSelectElement).value).toBe('purchase-race');
    expect(screen.getByRole('status', { name: 'Example setup status' }).textContent).toContain('Pending setup changes');
  });
});
