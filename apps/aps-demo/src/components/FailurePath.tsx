import { useState } from 'react';
import type { ComparisonRun } from '../domain/comparison.ts';
import { getCase } from '../domain/cases.ts';
import { decisionPath, laneMeaning } from '../domain/presentation.ts';
import { routeLink } from '../data.ts';
import { Badge } from './shared.tsx';

export function FailurePath({ run }: { run: ComparisonRun }) {
  const [selected, setSelected] = useState('condition');
  const definition = getCase(run.caseId);
  const stages = decisionPath(run);
  const active = stages.find(stage => stage.id === selected) ?? stages[1];
  return <section className="panel failure-path" aria-labelledby={`path-title-${run.id}`}>
    <div className="section-title"><h2 id={`path-title-${run.id}`}>Follow the decision path</h2><Badge>Illustrative path · not live agents</Badge></div>
    <p className="path-context">Follow the condition from the shared request to the two decisions. Select a stage to distinguish an assumed prerequisite, a supplied input and a modeled consequence.</p>
    <ol className="path-track" aria-label="Ordered causal path">{stages.map((stage, index) => <li key={stage.id}><button aria-pressed={selected === stage.id} aria-controls={`path-detail-${run.id}`} onClick={() => setSelected(stage.id)}><span className="path-number" aria-hidden="true">{index + 1}</span><strong>{stage.title}</strong><small>{stage.value}</small></button></li>)}</ol>
    <div className="path-detail" id={`path-detail-${run.id}`} role="region" aria-label="Selected path stage"><Badge>{active.type}</Badge><h3>{active.title}</h3><p>{active.detail}</p><a href={routeLink('governance', 'control', definition.control)}>Inspect the related control →</a></div>
    <div className="path-branches" aria-label="Outcome branches">{(['B', 'C'] as const).map(mode => {
      const result = run.results[mode];
      const meaning = laneMeaning(result);
      return <div key={mode} className={`path-branch outcome-${meaning.tone}`}><strong>{mode} · {result.decision === 'allow' ? 'request permitted' : result.decision === 'deny' ? 'request stopped' : 'review requested'}</strong><p className="path-branch-status">{meaning.label}</p><p>{result.effect ? result.businessOutcome : 'Downstream business effects are not modeled for this case.'}</p></div>;
    })}</div>
    <p className="path-next-question"><strong>Question for the people responsible:</strong> {run.caseId === 'conflict' ? 'Who should resolve the competing objectives, and what information would justify that decision?' : run.results.C.executed ? 'What evidence would establish that the permitted purchase is actually needed and its inputs are correct?' : 'What information or authority would justify a different next attempt while the work remains outstanding?'}</p>
    <details><summary>What this path does not show</summary><p>{definition.limitation}</p><p>Financial loss, changed supplier prices and delivery failures are possible consequences, not measured events in this browser model. The broader procurement topology describes relationships; this path does not simulate independent agent reasoning or a cascading operational incident.</p></details>
  </section>;
}
