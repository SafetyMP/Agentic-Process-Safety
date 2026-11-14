import type { CaseDefinition } from '../domain/cases.ts';

type SourceKind = 'hazard' | 'control' | 'recorded';

/** Explains a relationship, never upgrades a related source into execution evidence. */
export function CaseEvidenceBridge({ activeCase, kind, matches, sourceLabel }: {
  activeCase: CaseDefinition; kind: SourceKind; matches: boolean; sourceLabel: string;
}) {
  const relationship = activeCase.id === 'stale'
    ? { question: 'Was the finance approval still current when this purchase was attempted?', source: kind === 'recorded' ? 'The recorded expiry case tests an expired finance approval.' : 'The source finding concerns an expired quotation and excess price; the linked control covers approval and other expiry checks.', gap: 'Approval freshness does not establish quotation validity. Price, demand and stock accuracy still need separate evidence.', next: 'What would establish that the quotation is still valid before another attempt?' }
    : activeCase.id === 'context'
      ? { question: 'Does this purchase carry context that belongs to its task?', source: kind === 'recorded' ? 'The recorded context substitution occurs at demand_mock; the browser illustration evaluates a purchase request.' : 'The source finding concerns context contamination; the mapped task-binding check covers a narrower condition.', gap: 'A context binding check does not establish source truth or resistance to live prompt injection. Related stages are not the same execution.', next: 'Which source and task binding would you need to verify before trusting this request?' }
      : activeCase.id === 'conflict'
        ? { question: 'Who should resolve the competing objectives before the purchase proceeds?', source: kind === 'recorded' ? 'The recorded goal-conflict case measures a budget violation, not objective arbitration.' : 'The source finding concerns competing objectives; production arbitration remains an explicit control gap.', gap: 'Requesting review does not resolve the conflict. A budget outcome does not establish an acceptable trade-off between objectives.', next: 'Which objectives, decision owner and unresolved trade-off should the discussion record?' }
        : { question: activeCase.objective, source: activeCase.evidenceNote, gap: activeCase.limitation, next: 'Which observation supports your recommendation, and what is still missing?' };
  return <section className="panel case-evidence-bridge" aria-label="How this source relates to your case">
    <p className="eyebrow">KEEP THE INVESTIGATION CONNECTED</p>
    <h2>{matches ? 'What this source can tell you' : 'A different source is under inspection'}</h2>
    <p><strong>Your case family:</strong> {activeCase.title}. <strong>Inspected source:</strong> {sourceLabel}.</p>
    {matches ? <>
      <div className="evidence-relationship-grid"><div><h3>Browser question</h3><p>{relationship.question}</p></div><div><h3>Related source</h3><p>{relationship.source}</p></div><div><h3>Still unresolved</h3><p>{relationship.gap}</p></div></div>
      <p><strong>Bring back a question:</strong> {relationship.next}</p>
    </> : <p>This selection is not the mapped source for your active case. Inspecting it does not change your retained comparison or make its results evidence for this case.</p>}
    <nav className="button-row investigation-return" aria-label="Continue your investigation"><a className="button" href="#/simulator">Return to your comparison →</a><a className="button primary" href="#/simulator?panel=discussion">Return to your reasoning →</a></nav>
  </section>;
}
