import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Audience = 'executive' | 'technical';
// Standalone legacy components keep their original presentation; the real App
// always supplies the provider, whose fresh-document default is Executive.
const Context = createContext<{ audience: Audience; choose: (next: Audience) => void; reveal: (id?: string) => void }>({ audience: 'technical', choose: () => {}, reveal: () => {} });
export function useAudience() { return useContext(Context); }
export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audience, setAudience] = useState<Audience>('executive');
  const returnTarget = useRef<HTMLElement | null>(null);
  function choose(next: Audience) {
    // Native radios retain focus. Evidence links can return to their invoking
    // common control when their destination is about to become hidden.
    if (next === 'executive' && document.activeElement?.closest('[data-technical]')) returnTarget.current?.focus();
    setAudience(next);
  }
  function reveal(id?: string) {
    returnTarget.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAudience('technical');
    if (id) requestAnimationFrame(() => document.getElementById(id)?.focus());
  }
  return <Context.Provider value={{ audience, choose, reveal }}><div data-audience={audience}>
    <div className="audience-bar"><fieldset className="audience-toggle"><legend>View</legend>{(['executive', 'technical'] as const).map(value => <label key={value}><input type="radio" name="audience" value={value} checked={audience === value} onChange={() => choose(value)}/>{value === 'executive' ? 'Executive' : 'Technical'}</label>)}</fieldset><span>Same run. Same controls. Same evidence.</span></div>{children}
  </div></Context.Provider>;
}
export function Technical({ children, id }: { children: ReactNode; id?: string }) {
  const { audience } = useAudience();
  return <div data-technical="" hidden={audience !== 'technical'} id={id} tabIndex={id ? -1 : undefined}>{children}</div>;
}
export function Executive({ children }: { children: ReactNode }) {
  const { audience } = useAudience();
  return <div className="executive-content" hidden={audience !== 'executive'}>{children}</div>;
}
export function EvidenceLink({ target, children }: { target: string; children: ReactNode }) {
  const { reveal } = useAudience();
  return <button className="text-button evidence-link" onClick={() => reveal(target)}>{children}</button>;
}
