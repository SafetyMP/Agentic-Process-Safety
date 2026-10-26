// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AudienceProvider, Executive, Technical, EvidenceLink } from './AudienceView.tsx';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('has native exclusive radio semantics, focus retention and fresh-mount Executive default', () => {
  const fixture = <AudienceProvider><Executive><h1>Decision</h1></Executive><Technical id="detail"><h2>Record</h2><button>Technical action</button></Technical></AudienceProvider>;
  const first = render(fixture);
  const executive = screen.getByRole('radio', { name: 'Executive' }) as HTMLInputElement;
  const technical = screen.getByRole('radio', { name: 'Technical' }) as HTMLInputElement;
  expect(executive.checked).toBe(true); expect(technical.checked).toBe(false);
  expect(executive.name).toBe(technical.name); expect(screen.queryByRole('button', { name: 'Technical action' })).toBeNull();
  technical.focus(); fireEvent.click(technical); expect(document.activeElement).toBe(technical); expect(technical.checked).toBe(true); expect(executive.checked).toBe(false);
  expect(screen.getByRole('button', { name: 'Technical action' })).toBeTruthy();
  executive.focus(); fireEvent.click(executive); expect(document.activeElement).toBe(executive); expect(screen.queryByRole('button', { name: 'Technical action' })).toBeNull();
  first.unmount(); render(fixture); expect((screen.getByRole('radio', { name: 'Executive' }) as HTMLInputElement).checked).toBe(true);
});
it('reveals the requested technical record and focuses it without replacing its DOM owner', () => {
  const frames: FrameRequestCallback[] = []; vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  render(<AudienceProvider><Executive><EvidenceLink target="record">Inspect evidence</EvidenceLink></Executive><Technical id="record"><h2>Actual record</h2></Technical></AudienceProvider>);
  const owner = document.getElementById('record'); const link = screen.getByRole('button', { name: 'Inspect evidence' }); link.focus(); fireEvent.click(link);
  frames.forEach(callback => callback(0)); expect(document.getElementById('record')).toBe(owner); expect(document.activeElement).toBe(owner);
  expect((screen.getByRole('radio', { name: 'Technical' }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: 'Executive' })); expect(document.activeElement).toBe(link);
});
