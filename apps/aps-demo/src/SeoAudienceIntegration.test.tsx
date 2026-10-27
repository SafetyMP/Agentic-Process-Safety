// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { App } from './App.tsx';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); window.location.hash = ''; });

test('layers overview SEO onto the new audience titles without restoring the old hero', () => {
  window.location.hash = '#/overview'; render(<App/>);
  expect((screen.getByRole('radio', { name: 'Executive' }) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Use HAZOP before delegating purchasing.');
  expect(document.title).toBe('Conceptual | Agentic Process Safety | HAZOP for AI Agent Swarms');
  expect(screen.queryByText('Make the unsafe path visible.')).toBeNull();
  fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Autonomy with boundaries.');
  expect(document.title).toBe('Overview | Agentic Process Safety | HAZOP for AI Agent Swarms');
  expect(screen.getByText(/^Agentic Process Safety applies HAZOP to AI agent swarms\./)).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Procurement topology' })).toBeTruthy();
  expect(document.querySelectorAll('.node-buttons button')).toHaveLength(8);
  fireEvent.click(screen.getByRole('radio', { name: 'Executive' }));
  expect(document.title).toBe('Conceptual | Agentic Process Safety | HAZOP for AI Agent Swarms');
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Use HAZOP before delegating purchasing.');
});

test('retains audience route naming and route-focus behavior beyond the SEO overview', async () => {
  window.location.hash = '#/overview'; render(<App/>);
  await act(async () => { window.location.hash = '#/simulator'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(document.title).toBe('Analytical | Agentic Process Safety');
  const heading = screen.getByRole('heading', { level: 1, name: 'What must stay true before we buy?' });
  expect(document.activeElement).toBe(heading);
  fireEvent.click(screen.getByRole('radio', { name: 'Technical' }));
  expect(document.title).toBe('Swarm Simulator | Agentic Process Safety');
  expect(screen.getByRole('navigation', { name: 'Main navigation' }).querySelectorAll('a')).toHaveLength(5);
});
