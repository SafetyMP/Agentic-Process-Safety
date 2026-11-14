// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FindingContext } from './FindingContext.tsx';
import { Governance } from '../routes/Governance.tsx';
import { AudienceProvider } from './AudienceView.tsx';
import { initialState, reducer } from '../domain/simulation.ts';
afterEach(cleanup);

it('retains the originating finding and its partial coverage across model inspection', () => {
  render(<FindingContext params={new URLSearchParams({ hazard: 'APS-ad4a560c0e8ea4fa1023' })} story="unauthorized"/>);
  expect(screen.getByRole('region', { name: 'Originating finding' }).textContent).toContain('partial illustration mapping');
  expect(screen.getByRole('link', { name: 'Return to originating finding →' }).getAttribute('href')).toBe('#/hazop?hazard=APS-ad4a560c0e8ea4fa1023');
});
it('does not imply the retained finding covers a changed request', () => {
  render(<FindingContext params={new URLSearchParams({ hazard: 'APS-ad4a560c0e8ea4fa1023' })} story="stale"/>);
  expect(screen.getByRole('region', { name: 'Originating finding' }).textContent).toContain('current request differs');
  expect(screen.queryByText(/partial illustration mapping/)).toBeNull();
});
it('reports unavailable context without substituting a finding', () => {
  render(<FindingContext params={new URLSearchParams({ hazard: 'not-a-finding' })} story="unauthorized"/>);
  expect(screen.getByText(/originating finding is unavailable/)).toBeTruthy();
  expect(screen.getByRole('link').getAttribute('href')).toBe('#/hazop');
});
it('links an evaluated override to assurance without a configuring story parameter', () => {
  let state = initialState(42, 'C', 'normal');
  state = reducer(state, { type: 'inject', story: 'unauthorized' });
  for (let i = 0; i < 3; i++) state = reducer(state, { type: 'step' });
  expect(state.events).toHaveLength(1);
  render(<AudienceProvider><Governance state={state} dispatch={() => { throw new Error('Navigation must not configure the policy'); }} params={new URLSearchParams({ hazard: 'APS-ad4a560c0e8ea4fa1023' })}/></AudienceProvider>);
  const link = screen.getByRole('link', { name: 'Continue walkthrough: inspect this SIMULATED outcome in assurance →' });
  expect(link.getAttribute('href')).toBe('#/assurance?hazard=APS-ad4a560c0e8ea4fa1023');
  expect(state.fault).toBe('unauthorized');
  expect(state.events).toHaveLength(1);
});
