import { experiment, routeLink } from '../data.ts';
import { Coverage } from './Coverage.tsx';

/** Test identifiers are the frozen source mapping, not browser execution claims. */
export function TestEvidence({ control }: { control: string | null }) {
  const links = experiment.trials.filter(t => t.requirement_links.some(r => r.controls.some(c => !control || c.id === control)));
  const controls = [...new Map(links.flatMap(t => t.requirement_links.flatMap(r => r.controls)).filter(c => !control || c.id === control).map(c => [c.id, c])).values()];
  return <><Coverage/><section className="panel"><h2>Recorded control test index</h2><p>Source selectors refer to <code>tests/test_governance.py</code>. Trial links below resolve to the frozen execution records. This index does not run Python tests in the browser.</p>{controls.map(c => <details key={c.id}><summary>{c.id} → {c.test === 'none' ? 'No test mapped' : c.test}</summary><p>{c.description}</p>{c.test === 'none' ? <p>No source test exists in this mapping. This remains an explicit control gap.</p> : <p>Source selector: <code>tests/test_governance.py::{c.test}</code></p>}<div className="button-row">{links.filter(t => t.requirement_links.some(r => r.controls.some(item => item.id === c.id))).map(t => <a key={t.sequence} href={routeLink('assurance', 'trial', String(t.sequence))}>Evidence #{t.sequence} · {t.configuration} / {t.fault}</a>)}</div></details>)}{controls.length === 0 && <p>No distinct recorded trial mapping for this control. Consult the proposed requirement and its explicit limitations above.</p>}</section></>;
}
