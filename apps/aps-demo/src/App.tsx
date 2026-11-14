import { useEffect, useState } from 'react';
import { SessionProvider, useSession } from './components/SessionContext.tsx';
import { runTitle } from './domain/presentation.ts';
import { Overview } from './routes/Overview.tsx';
import { Hazop } from './routes/Hazop.tsx';
import { Governance } from './routes/Governance.tsx';
import { Simulator } from './routes/Simulator.tsx';
import { Assurance } from './routes/Assurance.tsx';

const sections = [
  { id: 'overview', name: 'Start here', icon: '◈' },
  { id: 'simulator', name: 'Case Lab', icon: '⇄' },
  { id: 'hazop', name: 'Hazard study', icon: '⊞' },
  { id: 'governance', name: 'Controls', icon: '◇' },
  { id: 'assurance', name: 'Evidence', icon: '◉' },
];
type Theme = 'system' | 'light' | 'dark';
function storedTheme(): Theme {
  try {
    const value = localStorage.getItem('aps-theme');
    return value === 'dark' || value === 'light' ? value : 'system';
  } catch { return 'system'; }
}
function locationState() {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return { route: sections.some(section => section.id === path) ? path : 'overview', params: new URLSearchParams(query) };
}

function Workspace() {
  const [location, setLocation] = useState(locationState);
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const { caseDefinition, selectedRun, isDirty, setCase, resetInputs, configError } = useSession();
  const currentSection = sections.find(section => section.id === location.route)!;
  useEffect(() => {
    const changed = () => setLocation(locationState());
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme; };
    apply();
    media.addEventListener('change', apply);
    try { localStorage.setItem('aps-theme', theme); } catch { /* Theme works without storage. */ }
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.title = `${currentSection.name} | Agentic Process Safety`;
    document.documentElement.scrollIntoView?.({ block: 'start' });
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [currentSection.name]);
  useEffect(() => {
    if (location.route === 'simulator' && location.params.get('panel') === 'discussion') {
      document.getElementById('discussion')?.scrollIntoView?.({ block: 'start' });
      document.getElementById('discussion')?.focus({ preventScroll: true });
    }
  }, [location]);
  function openCase() {
    setCase('stale');
    resetInputs();
    window.location.hash = '/simulator';
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="#/overview"><span className="brand-icon">A</span><span>APS<small>Agentic Process Safety</small></span></a>
      <div className="workspace-tag">PROCUREMENT / SANDBOX</div>
      <nav aria-label="Main navigation">{sections.map((section, index) => <a key={section.id} href={`#/${section.id}`} aria-current={location.route === section.id ? 'page' : undefined}><span aria-hidden="true">{section.icon}</span>{section.name}<small aria-hidden="true">0{index + 1}</small></a>)}</nav>
      <div className="sidebar-bottom"><span className="status-dot"/> A shared question<p>Permission is one condition.<br/>What else must hold?</p><button onClick={openCase}>Explore the opening case →</button><p>Illustrative models · frozen evidence<br/>No live operational authority</p></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div><span className="muted">Research workspace</span><span className="topbar-divider">/</span><strong>{currentSection.name}</strong></div><label className="theme-select"><span id="app-theme">Theme</span><select aria-labelledby="app-theme" value={theme} onChange={event => setTheme(event.target.value as Theme)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label></header>
      {(location.route !== 'overview' || selectedRun) && <section className="case-context" aria-label="Shared case context">
        <div><small>ILLUSTRATIVE WORKSPACE</small><strong>{selectedRun && !isDirty ? runTitle(selectedRun) : caseDefinition.title}</strong><p>{selectedRun ? `Selected ${selectedRun.id} · ${runTitle(selectedRun)}` : 'No comparison evaluated yet'}{isDirty && selectedRun ? ' · Inputs changed — run again' : ''}</p></div>
        <div className="button-row">{location.route !== 'simulator' && <a className="button" href="#/simulator">Return to comparison →</a>}<a className="text-button" href="#/simulator?panel=discussion">Discussion worksheet</a></div>
      </section>}
      <main id="main-content" tabIndex={-1}>
        {configError && <div className="notice input-error" role="alert">{configError}</div>}
        {location.route === 'overview' ? <Overview/> : location.route === 'hazop' ? <Hazop key={location.params.toString()} params={location.params}/> : location.route === 'governance' ? <Governance params={location.params}/> : location.route === 'simulator' ? <Simulator/> : <Assurance key={location.params.toString()} params={location.params}/>}
      </main>
      <footer>APS Research Demonstration<span>All hazards unverified · Browser effects illustrative · No safety certification</span></footer>
    </div>
  </div>;
}

export function App() {
  return <SessionProvider><Workspace/></SessionProvider>;
}
