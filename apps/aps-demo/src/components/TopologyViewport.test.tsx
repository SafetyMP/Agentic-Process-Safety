// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { TopologyViewport } from './TopologyViewport.tsx';
const flow = vi.hoisted(() => ({ ready: true, initialized: true, width: 0, height: 0, fit: vi.fn<(options: object) => Promise<boolean>>(async () => true), bounds: { x: 0, y: 0, width: 1010, height: 377 } }));
function renderer() { return { width: flow.width, height: flow.height, panZoom: flow.initialized ? {} : null, nodesInitialized: false, nodeLookup: new Map([['test-node', { id: 'test-node', hidden: false, measured: { width: flow.ready ? 170 : 0, height: flow.ready ? 57 : 0 }, internals: { positionAbsolute: { x: 0, y: 0 } } }]]) }; }
vi.mock('@xyflow/react', () => ({ useNodesInitialized: () => false, useStore: (selector: (state: ReturnType<typeof renderer>) => unknown) => selector(renderer()), useStoreApi: () => ({ getState: renderer }), useReactFlow: () => ({ fitBounds: (_bounds: object, options: object) => flow.fit(options), getNodes: () => [{ id: 'test-node', hidden: false }], getInternalNode: () => ({ measured: { width: flow.ready ? 170 : 0, height: flow.ready ? 57 : 0 } }), getNodesBounds: () => flow.bounds, viewportInitialized: flow.initialized }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); flow.fit.mockClear(); flow.ready = true; flow.initialized = true; flow.width = 0; flow.height = 0; });
function fixture() {
  let width = 0; let height = 0; const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ width, height } as DOMRect);
  const pane = document.createElement('div'); pane.className = 'react-flow__renderer'; element.appendChild(pane);
  Object.defineProperty(pane, 'clientWidth', { get: () => Math.round(width) }); Object.defineProperty(pane, 'clientHeight', { get: () => Math.round(height) });
  const container = { current: element }; const manual = { current: false };
  const frames = new Map<number, FrameRequestCallback>(); let id = 0; let resize = () => {};
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect() {} });
  return { container, manual, dimensions: (w: number, h: number) => { width = w; height = h; flow.width = Math.round(w); flow.height = Math.round(h); }, resize: () => resize(), flush: () => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); }) };
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


it('waits for renderer content dimensions even when the DOM is positive, then fits after a store update without an outer resize', () => {
  const h = fixture(); h.dimensions(605, 288); flow.width = 0; flow.height = 0;
  const view = render(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  flow.width = 605; flow.height = 288; view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush();
  expect(flow.fit).toHaveBeenCalledExactlyOnceWith({ duration: 0, padding: 0.15 }); // global nodesInitialized is still false; measured bounds are ready.
});
it('rejects mismatched renderer dimensions and zero measured nodes, without forcing readiness', () => {
  const h = fixture(); h.dimensions(605, 288); flow.width = 400;
  const view = render(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  flow.width = 605; flow.ready = false; view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  flow.ready = true; view.rerender(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.flush(); expect(flow.fit).toHaveBeenCalledTimes(1);
});
it('a manual intent before the scheduled frame vetoes fitting; a resolved promise never schedules later viewport work', async () => {
  const h = fixture(); h.dimensions(605, 288);
  render(<TopologyViewport visible container={h.container} manual={h.manual}/>); h.manual.current = true; h.flush(); expect(flow.fit).not.toHaveBeenCalled();
  h.manual.current = false; let resolve: (value: boolean) => void = () => {}; flow.fit.mockImplementationOnce(() => new Promise<boolean>(done => { resolve = done; }));
  h.resize(); h.flush(); expect(flow.fit).toHaveBeenCalledTimes(1);
  h.manual.current = true; h.resize(); h.flush(); await act(async () => resolve(true)); h.flush(); expect(flow.fit).toHaveBeenCalledTimes(1);
});
