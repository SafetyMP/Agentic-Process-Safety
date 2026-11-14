import type { ComparisonRun } from '../domain/comparison.ts';

/** A timing comparison is meaningful only when every other request field and baseline agree. */
export function timingReference(run: ComparisonRun | undefined, runs: ComparisonRun[]): ComparisonRun | undefined {
  if (!run || run.caseId !== 'stale') return undefined;
  const withoutAge = (item: ComparisonRun) => JSON.stringify({ ...item.request, approvalAge: undefined });
  return runs.find(other => other.id !== run.id && other.caseId === run.caseId
    && other.request.approvalAge !== run.request.approvalAge
    && withoutAge(other) === withoutAge(run)
    && JSON.stringify(other.baseline) === JSON.stringify(run.baseline));
}

export function CaseProgress({ current, hasRun, dirty, timing, varied, ready, onCompare, onExplore, onPosition }: {
  current: 1 | 2 | 3; hasRun: boolean; dirty: boolean; timing: boolean; varied: boolean; ready: boolean;
  onCompare: () => void; onExplore: () => void; onPosition: () => void;
}) {
  return <nav className="case-progress" aria-label="Case investigation steps"><ol className="case-progress-list">
    <li><button type="button" className="case-progress-step" aria-current={current === 1 ? 'step' : undefined} onClick={onCompare}><strong>1 · Compare</strong><small>{dirty ? 'New inputs need a comparison' : hasRun ? 'Retained result available' : 'One request, two control bundles'}</small></button></li>
    <li><button type="button" className="case-progress-step" aria-current={current === 2 ? 'step' : undefined} disabled={!hasRun || dirty} onClick={onExplore}><strong>2 · {timing ? 'Change one condition' : 'Inspect the decision'}</strong><small>{timing ? varied ? 'Timing variation available' : 'Try the other side of expiry' : 'Follow the case-specific path'}</small></button></li>
    <li><button type="button" className="case-progress-step" aria-current={current === 3 ? 'step' : undefined} disabled={!hasRun || dirty} onClick={onPosition}><strong>3 · Form a position</strong><small>{ready ? 'Ready for discussion, not approval' : 'Recommend, support, question'}</small></button></li>
  </ol></nav>;
}
