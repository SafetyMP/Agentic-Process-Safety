import { WorkedHazop } from '../components/TechnicalGuide.tsx';
import { HazopConversation } from '../components/HazopConversation.tsx';
import type { ReviewContext } from '../components/HazopConversation.tsx';
import type { WorkflowState } from '../workflow/index.ts';
import { Executive, Technical, useAudience } from '../components/AudienceView.tsx';
import { useLayoutEffect, useRef, useState } from 'react';
import { findingExercise } from '../domain/reviewMappings.ts';
import { hazards, requirements, references, routeLink } from '../data.ts';
import { Badge, Heading, Stat } from '../components/shared.tsx';

export function Hazop({ params, workflow, reviewContext }: { params: URLSearchParams; workflow?: WorkflowState; reviewContext?: ReviewContext }) {
  const { audience } = useAudience();
  const knownNode = (value: string | null) => hazards.some(h => h.node === value) ? value! : 'all';
  const knownDeviation = (value: string | null) => hazards.some(h => h.deviation === value) ? value! : 'all';
  const [filters, setFilters] = useState(() => ({ search: params.get('search') ?? '', node: knownNode(params.get('node')), deviation: knownDeviation(params.get('deviation')), sort: ['node', 'deviation'].includes(params.get('sort') ?? '') ? params.get('sort')! : 'id' }));
  const { search, node, deviation, sort } = filters;
  const [selected, setSelected] = useState(hazards.find(h => h.id === params.get('hazard'))?.id ?? hazards[0].id);
  const [invalidRequest, setInvalidRequest] = useState(() => params.has('hazard') && !hazards.some(h => h.id === params.get('hazard')));
  const [inspection, setInspection] = useState(0);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const registerHeading = useRef<HTMLHeadingElement>(null);
  const rowButtons = useRef(new Map<string, HTMLButtonElement>());
  function filtered(next: typeof filters) {
    return hazards.filter(h => (next.node === 'all' || h.node === next.node) && (next.deviation === 'all' || h.deviation === next.deviation) && `${h.id} ${h.node} ${h.deviation} ${h.causes.join(' ')} ${h.consequences.join(' ')}`.toLowerCase().includes(next.search.toLowerCase())).sort((a, b) => (next.sort === 'node' ? a.node.localeCompare(b.node) : next.sort === 'deviation' ? a.deviation.localeCompare(b.deviation) : a.id.localeCompare(b.id)) || a.id.localeCompare(b.id));
  }
  const rows = filtered(filters);
  const h = hazards.find(h => h.id === selected) ?? hazards[0];
  const requirement = requirements.find(r => r.hazard_id === h.id);
  const exercise = findingExercise(h.id);
  function selectionLink(next: typeof filters, id: string) {
    const query = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ ...next, hazard: id })) {
      if (!value || value === 'all' || key === 'sort' && value === 'id') query.delete(key);
      else query.set(key, value);
    }
    return `#/hazop?${query.toString()}`;
  }
  function remember(next: typeof filters, id: string) {
    // Updating our own route state must not remount the input on each keystroke.
    window.history.replaceState(window.history.state, '', selectionLink(next, id));
  }
  function changeFilter(key: keyof typeof filters, value: string) {
    const next = { ...filters, [key]: value }; const matches = filtered(next);
    const id = matches.some(row => row.id === selected) || !matches.length ? selected : matches[0].id;
    setFilters(next); setSelected(id); setInvalidRequest(false); remember(next, id);
  }
  function inspect(id: string) { setSelected(id); setInvalidRequest(false); remember(filters, id); setInspection(value => value + 1); }
  useLayoutEffect(() => {
    if (!inspection) return;
    detailHeading.current?.focus(); detailHeading.current?.scrollIntoView?.({ block: 'nearest' });
  }, [inspection]);
  const pinned = !rows.some(row => row.id === h.id);
  return <><Heading eyebrow={audience === 'executive' ? 'ANALYTICAL / SUPPORTING HAZOP REVIEW' : '01 / HAZOP LAB'} title={audience === 'executive' ? h.id === 'APS-f47191931b96a999a61c' ? 'What could go wrong between permission and purchase?' : 'What can depart from intended purchasing?' : 'Challenge the intended behavior.'}>{audience === 'executive' ? 'Start with intended work. Connect a departure to consequences, safeguards and the people who must resolve the open questions.' : 'Inspect generated deviations and authored reference cases. Findings are hypotheses for expert review; ratings and approvals have not been supplied.'}</Heading><Executive>{invalidRequest && <p>Requested finding unavailable; showing the current source fallback. No model was changed.</p>}<HazopConversation state={workflow} context={reviewContext} hazardId={h.id}/><a className="button" href="#/simulator">Return to the purchasing operation</a></Executive><Technical><WorkedHazop/><div className="stats"><Stat label="Hazard register" value="96" note="Six nodes × sixteen deviations"/><Stat label="Approved findings" value="0" note="All review states remain unverified"/><Stat label="Risk ratings" value="Unknown" note="Severity and likelihood are null"/><Stat label="Proposed requirements" value={requirements.length} note="Implementation links do not imply approval"/></div>
    <section className="panel"><div className="section-title"><h2 ref={registerHeading} tabIndex={-1}>{audience === 'executive' ? 'Choose a finding to challenge' : 'Hazard register'}</h2><Badge>{rows.length} / 96 findings</Badge></div><div className="control-grid"><label>Search findings<input type="search" value={search} onChange={e => changeFilter('search', e.target.value)} placeholder="Cause, consequence or ID"/></label><label><span id="hazop-node-label">Agent node</span><select aria-labelledby="hazop-node-label" value={node} onChange={e => changeFilter('node', e.target.value)}><option value="all">All agents</option>{[...new Set(hazards.map(h => h.node))].sort().map(n => <option key={n}>{n}</option>)}</select></label><label><span id="hazop-deviation-label">Guideword / deviation</span><select aria-labelledby="hazop-deviation-label" value={deviation} onChange={e => changeFilter('deviation', e.target.value)}><option value="all">All deviations</option>{[...new Set(hazards.map(h => h.deviation))].sort().map(d => <option key={d}>{d}</option>)}</select></label><label><span id="hazop-sort-label">Sort findings</span><select aria-labelledby="hazop-sort-label" value={sort} onChange={e => changeFilter('sort', e.target.value)}><option value="id">Stable ID</option><option value="node">Agent node</option><option value="deviation">Deviation</option></select></label></div><div className="table-scroll register"><table><caption className="sr-only">Generated hazards, all unverified with null ratings</caption><thead><tr><th>Finding</th><th>Agent</th><th>Deviation</th><th>Review</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={row.id === h.id ? 'selected-row' : ''}><td><button className="text-button" ref={element => { if (element) rowButtons.current.set(row.id, element); else rowButtons.current.delete(row.id); }} aria-pressed={row.id === h.id} onClick={() => inspect(row.id)}>{row.node} · {row.deviation.replaceAll('_', ' ')}<small>{row.id}</small></button></td><td>{row.node}</td><td>{row.deviation.replaceAll('_', ' ')}</td><td>○ {row.review_state}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="empty">No findings match. Adjust the filters or search.</p>}</div></section>
    <section className="panel" id={h.id} tabIndex={-1}><Badge>UNVERIFIED · RATINGS UNKNOWN</Badge><h2 ref={detailHeading} tabIndex={-1}>{h.deviation.replaceAll('_', ' ')} / {h.node}</h2>{pinned && <p role="status">Pinned finding outside the current filter: {h.node} / {h.deviation.replaceAll('_', ' ')}. Clear or adjust the filters to return it to the register.</p>}<div className="button-row"><button onClick={() => (rowButtons.current.get(h.id) ?? registerHeading.current)?.focus()}>Return to selected finding in register</button><a href={selectionLink(filters, h.id)}>Link to this finding and filters</a></div><p className="mono">{h.id}</p><p><strong>Intended behavior:</strong> {h.intent}</p><div className="detail-grid">{[['Potential causes', h.causes], ['Potential consequences', h.consequences], ['Declared safeguards', h.safeguards], ['Proposed controls', h.candidate_controls]].map(([title, values]) => <div key={String(title)}><h3>{title}</h3><ul>{(values as string[]).map(v => <li key={v}>{v}</li>)}</ul></div>)}</div><p>Severity: unknown · Likelihood: unknown · Residual risk: {h.residual_risk}</p>{requirement ? <div className="notice"><strong>{requirement.id} · {requirement.state}</strong><p>{requirement.text}</p>{requirement.controls.map(c => <p key={c.id}><a href={routeLink('assurance', 'control', c.id)}>{c.id} → {c.test}</a> · {c.status}<br/>{c.gap}</p>)}</div> : <p className="notice">No direct authored requirement mapping for this node/deviation. Proposed safeguards require expert design.</p>}<section aria-label="Finding exercise mapping"><h3>Applicable request illustrations</h3><p>Mapping: {exercise.coverage}. {exercise.explanation}</p>{exercise.stories.map(story => <p key={story.id}><a href={`${routeLink('governance', 'story', story.id)}&hazard=${encodeURIComponent(h.id)}`}>{story.label} →</a></p>)}</section></section>
    <div id="hazop-technical-reference" tabIndex={-1}><section className="panel"><h2>16 authored reference scenarios</h2><p>These are reference examples. They are separate from the 96 generated findings and are not observed incidents. Agent and deviation filters apply here; Search findings applies only to the generated register.</p><div className="reference-grid">{references.filter(r => (node === 'all' || r.node === node) && (deviation === 'all' || r.deviation === deviation)).map(r => <details key={r.id}><summary>{r.id} · {r.node} / {r.deviation}</summary><p>{r.cause}</p><p>{r.consequence}</p><p>Proposed: {r.control}</p></details>)}</div></section></div></Technical></>;
}
