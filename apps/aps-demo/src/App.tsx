import { useCallback, useEffect, useReducer, useState } from 'react';
import { initialState, reducer } from './domain/simulation.ts';
import { stories } from './domain/scenarios.ts';
import { Overview } from './routes/Overview.tsx';
import { Hazop } from './routes/Hazop.tsx';
import { Governance } from './routes/Governance.tsx';
import { Simulator } from './routes/Simulator.tsx';
import { Assurance } from './routes/Assurance.tsx';
import { controlRequirement, routeLink } from './data.ts';
import { createWorkflow, exportWorkflow, importWorkflow, scenarioSpec, workflowReducer } from './workflow/index.ts';
import type { WorkflowCommand } from './workflow/index.ts';
import { MaterialRisk } from './components/ExecutiveCase.tsx';
import { AudienceProvider, Executive, Technical, useAudience } from './components/AudienceView.tsx';
import { WorkflowStage, WorkflowSummary } from './components/WorkflowStage.tsx';

const sections = [{ id: 'overview', name: 'Overview', icon: '◈' }, { id: 'hazop', name: 'HAZOP Lab', icon: '⊞' }, { id: 'governance', name: 'Control Plane', icon: '◇' }, { id: 'simulator', name: 'Swarm Simulator', icon: '⇄' }, { id: 'assurance', name: 'Assurance', icon: '◉' }];
type Theme = 'system' | 'light' | 'dark';
function storedTheme(): Theme {
  try { const t = localStorage.getItem('aps-theme'); return t === 'dark' || t === 'light' ? t : 'system'; } catch { return 'system'; }
}
function locationState() {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return { route: sections.some(s => s.id === path) ? path : 'overview', params: new URLSearchParams(query) };
}
export function App() { return <AudienceProvider><AppContent/></AudienceProvider>; }
function AppContent() {
  const { audience } = useAudience();
  const executive = audience === 'executive';
  const businessNames: Record<string, string> = { overview: 'Business case', simulator: 'Decision scenarios', governance: 'Decision rights', hazop: 'Business risks', assurance: 'Evidence and limitations' };
  const navigation = executive ? ['overview', 'simulator', 'governance', 'hazop', 'assurance'].map(id => sections.find(s => s.id === id)!) : sections;
  const [location, setLocation] = useState(locationState);
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(42, 'C', 'unauthorized'));
  const [workflow, setWorkflow] = useState(() => createWorkflow(scenarioSpec()));
  const workflowCommand = useCallback((command: WorkflowCommand) => setWorkflow(current => workflowReducer(current, command)), []);
  useEffect(() => {
    if (location.route !== 'simulator') setWorkflow(current => current.running ? workflowReducer(current, { type: 'pause' }) : current);
  }, [location.route]);
  const [guide, setGuide] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guideResetPending, setGuideResetPending] = useState(false);
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
  useEffect(() => { document.title = `${executive ? businessNames[location.route] : sections.find(s => s.id === location.route)!.name} | Agentic Process Safety`; }, [location.route, executive]);
  useEffect(() => { document.querySelector<HTMLElement>('#main-content h1')?.focus(); }, [location.route]);
  const effectiveStory = stories.find(s => s.id === (state.fault ?? state.story))!;
  const lastDecision = state.events.at(-1);
  const requirement = controlRequirement(effectiveStory.control);
  const steps = [
    { title: 'Inspect the objective', text: effectiveStory.objective, link: routeLink('overview') },
    { title: 'Inspect the attempted operation', text: effectiveStory.operation, link: routeLink('governance') },
    { title: 'Inspect the proposed HAZOP mapping', text: 'Findings remain unverified; mappings do not establish control effectiveness.', link: requirement ? routeLink('hazop', 'hazard', requirement.hazard_id) : routeLink('hazop') },
    { title: lastDecision ? `Current SIMULATED decision: ${lastDecision.decision.toUpperCase()}` : 'Evaluate the SIMULATED request', text: lastDecision ? lastDecision.reason : 'No decision has been observed. Select Evaluate simulated request to inspect the current mode and request.', link: routeLink('governance') },
    { title: lastDecision ? 'Inspect the current SIMULATED outcome' : 'No SIMULATED outcome yet', text: lastDecision ? 'The current policy-illustration outcome appears first. Frozen experimental results are separate below.' : 'You advanced without evaluating. No blocked or executed outcome is claimed; return to the Control Plane to evaluate.', link: routeLink('assurance') },
  ];
  function walk(index: number) {
    setGuide(true); setGuideStep(index); window.location.hash = steps[index].link;
  }
  function startGuide() {
    dispatch({ type: 'reset' });
    dispatch({ type: 'configure', story: 'unauthorized', mode: 'C', seed: 42 });
    setGuideResetPending(false); walk(0);
  }
  function requestGuide() {
    if (state.tick || state.running || state.pending || state.fault || state.events.length) setGuideResetPending(true);
    else startGuide();
  }
  return <div className="app-shell"><a href="#main-content" className="skip-link" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a><aside className="sidebar"><a className="brand" href="#/overview"><span className="brand-icon">A</span><span>APS<small>Agentic Process Safety</small></span></a><div className="workspace-tag">PROCUREMENT / SANDBOX</div><nav aria-label="Main navigation">{navigation.map((s, i) => <a key={s.id} href={`#/${s.id}`} aria-current={location.route === s.id ? 'page' : undefined}><span aria-hidden="true">{s.icon}</span>{executive ? businessNames[s.id] : s.name}<small>0{i + 1}</small></a>)}</nav><div className="sidebar-bottom"><span className="status-dot"/> Fully static demonstration<p>Local models. Frozen evidence.<br/>No live operational authority.</p><button onClick={requestGuide}>Guided walkthrough →</button></div></aside>
    <div className="main-shell"><header className="topbar"><div><span className="muted">{executive ? "Purchasing decision exercise" : "Research workspace"}</span><span className="topbar-divider">/</span><strong>{executive ? businessNames[location.route] : sections.find(s => s.id === location.route)!.name}</strong></div><label className="theme-select"><span id="app-theme">Theme</span><select aria-labelledby="app-theme" value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></header><div className="evidence-strip" aria-label="Evidence categories"><Executive><span>SIMULATION ONLY · Orders are not deliveries · No operational authority</span></Executive><Technical><span>Recorded experimental results</span><span>Replayed test evidence</span><span>Illustrative browser simulation</span></Technical></div>
    {guideResetPending && <section className="notice" aria-label="Walkthrough reset consequence"><h2>Start a new policy walkthrough?</h2><p>This clears the current single-request policy illustration and its decision history, then selects the unauthorized-tool example in mode C with seed 42. The separate workflow run and frozen evidence are unaffected.</p><div className="button-row"><button onClick={startGuide}>Start walkthrough and clear policy run</button><button onClick={() => setGuideResetPending(false)}>Keep current policy run</button></div></section>}
    {guide && <section className="walkthrough" aria-label="Guided walkthrough"><div><small>WALKTHROUGH / {guideStep + 1} OF {steps.length}</small><strong>{steps[guideStep].title}</strong><p>{steps[guideStep].text}</p></div><div className="button-row"><button disabled={guideStep === 0} onClick={() => walk(guideStep - 1)}>Back</button><button disabled={guideStep === steps.length - 1} onClick={() => walk(guideStep + 1)}>Next</button><button onClick={requestGuide}>Restart</button><button onClick={() => setGuide(false)}>Close walkthrough</button></div></section>}
    <main id="main-content" tabIndex={-1}><MaterialRisk state={state} workflow={workflow}/>{location.route === 'overview' ? <><Overview state={state} onWalkthrough={requestGuide}/>{workflow.transitionCount > 0 && <WorkflowSummary state={workflow}/>}</> : location.route === 'hazop' ? <Hazop key={location.params.toString()} params={location.params}/> : location.route === 'governance' ? <Governance state={state} dispatch={dispatch}/> : location.route === 'simulator' ? <><WorkflowStage state={workflow} onCommand={workflowCommand} onExport={() => exportWorkflow(workflow)} onImport={text => { const result = importWorkflow(text); if (!result.ok) return { ok: false, message: `${result.code}: ${result.message}. Current workflow retained.` }; setWorkflow(workflowReducer(result.state, { type: 'pause' })); return { ok: true, message: 'Replay recomputed and imported. Workflow paused; previous browser run replaced. No recorded evidence changed.' }; }}/><details className="panel legacy-policy"><summary>Separate single-request policy illustration</summary><p>This original three-stage illustration shares state with the Control Plane. It does not execute the six-agent workflow above.</p><Simulator state={state} dispatch={dispatch}/></details></> : <><Assurance key={location.params.toString()} state={state} params={location.params}/><WorkflowSummary state={workflow}/></>}</main><footer>APS Research Demonstration <span>All hazards unverified · Browser decisions are SIMULATED · No safety certification</span></footer></div></div>;
}
