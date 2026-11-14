import { useState } from 'react';
import type { ComparisonRun } from '../domain/comparison.ts';
import { getCase } from '../domain/cases.ts';
import { routeLink } from '../data.ts';
import { Badge } from './shared.tsx';

export function FailurePath({ run }: { run: ComparisonRun }) {
  const [selected, setSelected] = useState('checks');
  const definition = getCase(run.caseId);
  const c = run.results.C;
  const terminal = c.checks.find(check => check.status === 'fail');
  const stages = [
    { id: 'approval', title: 'Declared prerequisites', type: 'Declared assumption', detail: `${run.request.approved ? 'A matching finance approval is assumed available.' : 'A matching finance approval is absent.'} Earlier procurement workers are context for this illustration; they were not executed here.`, value: run.request.approved ? 'Approval available' : 'Approval absent' },
    { id: 'delay', title: 'Logical delay', type: 'Modeled input', detail: `Approval age is ${run.request.approvalAge} logical seconds. C requires age below 60 seconds. Playback and time spent reading this page do not age the request.`, value: `${run.request.approvalAge}s since approval` },
    { id: 'request', title: 'Same request', type: 'Modeled input', detail: `${definition.operation}. Actor: ${run.request.actor}; amount: ${run.request.amount} sandbox units. Both lanes evaluate the same frozen input.`, value: `${run.request.actor} · ${run.request.amount} units` },
    { id: 'checks', title: 'Decision boundary', type: 'Modeled event', detail: terminal ? `C stops at ${terminal.rule}: ${terminal.reason}. Later checks are not evaluated. B ${run.results.B.decision === 'allow' ? 'permits the request under its selected checks' : 'also rejects this request'}.` : 'All modeled C checks pass. Passing these conditions does not establish that the quotation or demand is correct.', value: terminal?.rule ?? 'All C checks pass' },
    { id: 'effects', title: 'Effects and next action', type: 'Modeled outcome', detail: `${run.results.B.businessOutcome} ${c.businessOutcome} ${definition.limitation}`, value: c.decision === 'deny' ? 'C: no effect' : c.decision === 'review' ? 'C: review pending' : 'C: permitted effect' },
  ];
  const active = stages.find(stage => stage.id === selected) ?? stages[3];
  return <section className="panel failure-path" aria-labelledby={`path-title-${run.id}`}>
    <div className="section-title"><h2 id={`path-title-${run.id}`}>Follow the failure path</h2><Badge>Illustrative path · not live agents</Badge></div>
    <p>Select a stage to inspect the condition and its consequence. Both branches share everything before the decision boundary.</p>
    <ol className="path-track" aria-label="Ordered causal path">{stages.map((stage, index) => <li key={stage.id}><button aria-pressed={selected === stage.id} aria-controls={`path-detail-${run.id}`} onClick={() => setSelected(stage.id)}><span className="path-number" aria-hidden="true">{index + 1}</span><strong>{stage.title}</strong><small>{stage.value}</small></button></li>)}</ol>
    <div className="path-branches" aria-label="Outcome branches">{(['B', 'C'] as const).map(mode => { const effect = run.results[mode].effect; return <div key={mode} className={`path-branch branch-${run.results[mode].decision}`}><strong>{mode} · {run.results[mode].decision === 'allow' ? 'request permitted' : run.results[mode].decision === 'deny' ? 'request blocked' : 'review requested'}</strong><p>{effect ? `Orders ${effect.before.orders} → ${effect.after.orders}; sandbox spend ${effect.before.spend} → ${effect.after.spend}.` : 'Downstream effects are not modeled for this case.'}</p></div>; })}</div>
    <div className="path-detail" id={`path-detail-${run.id}`} role="region" aria-label="Selected path stage"><Badge>{active.type}</Badge><h3>{active.title}</h3><p>{active.detail}</p><a href={routeLink('governance', 'control', definition.control)}>Inspect the related control →</a></div>
    <details><summary>What this path does not show</summary><p>Financial loss, changed supplier prices and delivery failures are possible consequences, not measured events in this browser model. A blocked purchase remains outstanding. A fresh approval does not establish that the underlying quotation, forecast or stock record is true.</p><p>The broader procurement topology describes system relationships. This path does not simulate independent agent reasoning or a cascading operational incident.</p></details>
  </section>;
}
