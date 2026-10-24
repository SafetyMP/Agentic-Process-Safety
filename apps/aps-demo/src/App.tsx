import { useEffect, useReducer, useState } from 'react';
import { initialState, reducer } from './domain/simulation.ts';
import { stories } from './domain/scenarios.ts';
import { Overview } from './routes/Overview.tsx';
import { Hazop } from './routes/Hazop.tsx';
import { Governance } from './routes/Governance.tsx';
import { Simulator } from './routes/Simulator.tsx';
import { Assurance } from './routes/Assurance.tsx';
import { scopeHazard, routeLink } from './data.ts';

const sections = [{ id: 'overview', name: 'Overview', icon: '◈' }, { id: 'hazop', name: 'HAZOP Lab', icon: '⊞' }, { id: 'governance', name: 'Control Plane', icon: '◇' }, { id: 'simulator', name: 'Swarm Simulator', icon: '⇄' }, { id: 'assurance', name: 'Assurance', icon: '◉' }];
type Theme = 'system' | 'light' | 'dark';
function storedTheme(): Theme {
  try { const t = localStorage.getItem('aps-theme'); return t === 'dark' || t === 'light' ? t : 'system'; } catch { return 'system'; }
}
function locationState() {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return { route: sections.some(s => s.id === path) ? path : 'overview', params: new URLSearchParams(query) };
}
export function App() {
  const [location, setLocation] = useState(locationState);
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(42, 'C', 'unauthorized'));
  const [guide, setGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  useEffect(() => {
    function changed() { const next = locationState(); setLocation(next); const story = stories.find(s => s.id === next.params.get('story')); if (story) dispatch({ type: 'configure', story: story.id }); }
    changed(); window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme; };
    apply(); media.addEventListener('change', apply); try { localStorage.setItem('aps-theme', theme); } catch { /* Storage can be disabled; theme remains functional for this visit. */ }
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => { if (!state.running) return; const timer = window.setInterval(() => dispatch({ type: 'timer' }), 700); return () => window.clearInterval(timer); }, [state.running]);
  useEffect(() => { document.title = `${sections.find(s => s.id === location.route)!.name} | Agentic Process Safety`; }, [location.route]);
  const steps = [
    { title: 'Inspect the objective', text: 'Supplier selects an eligible supplier. Purchase execution belongs to a different agent.', link: routeLink('overview') },
    { title: 'Attempt the unsafe operation', text: 'Inspect the supplier’s attempted purchase request. The next stages connect this intent to its hazard and gateway decision.', link: routeLink('governance', 'story', 'unauthorized') },
    { title: 'Inspect the relevant HAZOP deviation', text: 'AUTHORITY_ESCALATION proposes capability checks at the tool boundary. The finding remains unverified.', link: routeLink('hazop', 'hazard', scopeHazard.id) },
    { title: 'Gateway blocks the SIMULATED action', text: 'Select Evaluate simulated request. Mode C blocks the supplier’s attempted purchase. Inspect the linked control, test and recorded evidence.', link: routeLink('governance', 'story', 'unauthorized') },
    { title: 'Inspect the SIMULATED outcome', text: 'Your live browser decision appears first. Recorded experimental results and replayed test evidence are separate below.', link: routeLink('assurance') },
  ];
  function walk(index: number) {
    if (index === 0) dispatch({ type: 'reset' });
    if (index === 0) dispatch({ type: 'configure', story: 'unauthorized', mode: 'C', seed: 42 });
    setGuide(true); setGuideStep(index); window.location.hash = steps[index].link;
  }
  return <div className="app-shell"><a href="#main-content" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a><aside className="sidebar"><a className="brand" href="#/overview"><span className="brand-icon">A</span><span>APS<small>Agentic Process Safety</small></span></a><div className="workspace-tag">PROCUREMENT / SANDBOX</div><nav aria-label="Main navigation">{sections.map((s, i) => <a key={s.id} href={`#/${s.id}`} aria-current={location.route === s.id ? 'page' : undefined}><span aria-hidden="true">{s.icon}</span>{s.name}<small>0{i + 1}</small></a>)}</nav><div className="sidebar-bottom"><span className="status-dot"/> Fully static demonstration<p>Local models. Frozen evidence.<br/>No live operational authority.</p><button onClick={() => walk(0)}>Guided walkthrough →</button></div></aside>
    <div className="main-shell"><header className="topbar"><div><span className="muted">Research workspace</span><span className="topbar-divider">/</span><strong>{sections.find(s => s.id === location.route)!.name}</strong></div><label className="theme-select"><span id="app-theme">Theme</span><select aria-labelledby="app-theme" value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></header><div className="evidence-strip" aria-label="Evidence categories"><span>Recorded experimental results</span><span>Replayed test evidence</span><span>Illustrative browser simulation</span></div>
    {guide && <section className="walkthrough" aria-label="Guided walkthrough"><div><small>WALKTHROUGH / {guideStep + 1} OF {steps.length}</small><strong>{steps[guideStep].title}</strong><p>{steps[guideStep].text}</p></div><div className="button-row"><button disabled={guideStep === 0} onClick={() => walk(guideStep - 1)}>Back</button><button disabled={guideStep === steps.length - 1} onClick={() => walk(guideStep + 1)}>Next</button><button onClick={() => walk(0)}>Restart</button><button onClick={() => setGuide(false)}>Close walkthrough</button></div></section>}
    <main id="main-content" tabIndex={-1}>{location.route === 'overview' ? <Overview state={state} onWalkthrough={() => walk(0)}/> : location.route === 'hazop' ? <Hazop key={location.params.toString()} params={location.params}/> : location.route === 'governance' ? <Governance state={state} dispatch={dispatch}/> : location.route === 'simulator' ? <Simulator state={state} dispatch={dispatch}/> : <Assurance key={location.params.toString()} state={state} params={location.params}/>}</main><footer>APS Research Demonstration <span>All hazards unverified · Browser decisions are SIMULATED · No safety certification</span></footer></div></div>;
}
