// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { TopologyViewport } from './TopologyViewport.tsx';
const flow = vi.hoisted(() => ({ ready: true, initialized: true, fit: vi.fn(async () => true) }));
vi.mock('@xyflow/react', () => ({ useNodesInitialized: () => flow.ready, useReactFlow: () => ({ fitView: flow.fit, viewportInitialized: flow.initialized }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); flow.fit.mockClear(); flow.ready = true; flow.initialized = true; });
function fixture() {
  let width = 0; let height = 0; const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ width, height } as DOMRect);
  const container = { current: element }; const manual = { current: false };
  const frames = new Map<number, FrameRequestCallback>(); let id = 0; let resize = () => {};
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
  return { container, manual, dimensions: (w: number, h: number) => { width = w; height = h; }, resize: () => resize(), flush: () => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); }) };
}
it('does not fit hidden/zero-size graph; fits after reveal and positive layout', () => {
  const h = fixture(); const view = render(<TopologyViewport visible={false} container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  h.dimensions(605, 288); h.resize(); h.flush(); expect(flow.fit).toHaveBeenCalledExactlyOnceWith({ duration: 0, padding: 0.15 });
});
it('waits for node/viewport readiness and cancels pending work on hide', () => {
  const h = fixture(); h.dimensions(678, 288); flow.ready = false;
  const view = render(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  flow.ready = true; flow.initialized = false; view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  flow.initialized = true; view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>);
  view.rerender(<TopologyViewport visible={false} container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).toHaveBeenCalledTimes(1);
});
it('refits automatic resize but preserves intentional viewport across resize/reveal until explicit Fit View resets policy', () => {
  const h = fixture(); h.dimensions(605, 288); const view = render(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush();
  h.dimensions(678, 288); h.resize(); h.flush(); expect(flow.fit).toHaveBeenCalledTimes(2);
  h.manual.current = true; h.resize(); h.flush(); view.rerender(<TopologyViewport visible={false} container={h.container} manual={h.manual}/>); view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).toHaveBeenCalledTimes(2);
  h.manual.current = false; h.resize(); h.flush(); expect(flow.fit).toHaveBeenCalledTimes(3);
});
