import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { buildLabel } from './domain/audience.ts';
import { Overview } from './routes/Overview.tsx';
import { ShortStudy } from './routes/ShortStudy.tsx';
import { useBearingsSelection } from './components/useBearingsSelection.ts';
import { defaultWorkspace, readWorkspace, workspaceLink } from './domain/workspaceLink.ts';

const formerPerspectiveSections = new Set(['case-roles', 'case-executive', 'case-manager', 'case-educator']);

function caseLink(section?: string) {
  return section ? '#/study?section=' + encodeURIComponent(section) : '#/study';
}
type Theme = 'system' | 'light' | 'dark';
function storedTheme(): Theme {
  try {
    const value = localStorage.getItem('aps-theme');
    return value === 'dark' || value === 'light' ? value : 'system';
  } catch { return 'system'; }
}
function locationState() {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const study = path === '' || path === 'study';
  const section = study ? new URLSearchParams(query).get('section') : null;
  return {
    study,
    chapter: section && formerPerspectiveSections.has(section) ? 'case-choice' : section,
    workspace: study ? undefined : path === 'overview' ? readWorkspace(query) : defaultWorkspace,
  };
}

export function App() {
  const [location, setLocation] = useState(locationState);
  const order = useBearingsSelection(location.workspace);
  const { setSelection } = order;
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const lastChapter = useRef<string | undefined>(window.history.state?.apsChapter);
  const { study, chapter } = location;
  useEffect(() => {
    const changed = () => {
      const next = locationState();
      if (next.workspace) {
        lastChapter.current = window.history.state?.apsChapter ?? lastChapter.current;
        setSelection(next.workspace);
        window.history.replaceState({ ...window.history.state, apsChapter: lastChapter.current }, '', workspaceLink(next.workspace));
      }
      setLocation(next);
    };
    if (!locationState().study) changed();
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, [setSelection]);
  function chooseTrial(trial: number) {
    order.setTrial(trial);
    window.history.replaceState(window.history.state, '', workspaceLink({ ...order, trial }));
  }
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme; };
    apply();
    media.addEventListener('change', apply);
    try { localStorage.setItem('aps-theme', theme); } catch { /* Theme works without storage. */ }
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.title = (study ? 'The bearings case' : 'IT implementation') + ' | Agentic Process Safety';
    const heading = chapter && document.getElementById(chapter);
    if (heading && heading.closest('.case-story') && heading.matches('h1, h2, h3')) {
      heading.scrollIntoView?.({ block: 'start' });
      heading.focus({ preventScroll: true });
    } else {
      document.documentElement.scrollIntoView?.({ block: 'start' });
      document.getElementById('main-content')?.focus({ preventScroll: true });
    }
  }, [study, chapter]);
  function rememberChapter(event: MouseEvent<HTMLDivElement>) {
    if (!study || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (!link?.hash.startsWith('#/') || link.hash.startsWith('#/study')) return;
    const headings = Array.from(document.querySelectorAll<HTMLElement>('.case-story :is(h1,h2,h3)[id]'));
    const owner = link.closest('.case-story section[aria-labelledby]');
    const visibleHeading = headings.filter(item => item.getBoundingClientRect().top <= window.innerHeight / 3).pop();
    lastChapter.current = owner?.getAttribute('aria-labelledby') ?? visibleHeading?.id ?? 'case-opening';
    // Keep the case chapter in the previous history entry for the browser Back button.
    window.history.replaceState(window.history.state, '', caseLink(lastChapter.current));
  }
  const brand = <a className="brand" href="#/study"><span className="brand-icon" aria-hidden="true">A</span><span>APS<small>Agentic Process Safety</small></span></a>;
  const themePicker = <label className="theme-select"><span id="app-theme">Theme</span>
    <select aria-labelledby="app-theme" value={theme} onChange={event => setTheme(event.target.value as Theme)}>
      <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
    </select>
  </label>;
  return <div className={'app-shell case-edition ' + (study ? 'case-reading' : 'technical-edition')} onClickCapture={rememberChapter}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <header className="case-masthead">
      <div>{brand}
        <nav aria-label="Main navigation">
          {study
            ? <a href={workspaceLink(order)}>Technical workspace</a>
            : <a href={caseLink(lastChapter.current)}>Return to case</a>}
        </nav>
        {themePicker}
      </div>
    </header>
    <div className="main-shell">
      <main id="main-content" tabIndex={-1}>
        <div hidden={!study}><ShortStudy order={order}/></div>
        {!study && <Overview order={order} onTrialChange={chooseTrial}/>}
      </main>
      <footer>
        <div>{study ? 'Agentic Process Safety' : 'APS Research Demonstration · build ' + buildLabel}
          <nav aria-label="Project resources">
            <a href="./guide.html" target="_blank" rel="noopener">Project guide <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            {!study && <a href="./llms.txt" target="_blank" rel="noopener">Agent reading map <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>}
            <a href="https://github.com/SafetyMP/Agentic-Process-Safety" target="_blank" rel="noopener">Source repository <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
          </nav>
        </div>
        {!study && <span>All hazards unverified · Browser effects illustrative · No safety certification</span>}
      </footer>
    </div>
  </div>;
}
