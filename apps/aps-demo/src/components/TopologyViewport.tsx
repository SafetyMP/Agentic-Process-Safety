import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useReactFlow, useStore, useStoreApi } from '@xyflow/react';

/** Automatic framing has one owner and no queued renderer fit. Measured node
 * bounds, not the controlled-array readiness flag, establish readiness. */
export function TopologyViewport({ visible, container, manual }: { visible: boolean; container: RefObject<HTMLDivElement | null>; manual: RefObject<boolean> }) {
  const { fitBounds, getNodes, getInternalNode, getNodesBounds, viewportInitialized } = useReactFlow();
  const store = useStoreApi();
  const width = useStore(s => s.width);
  const height = useStore(s => s.height);
  // Primitive subscription notices actual internal measurements even when the
  // controlled user nodes never receive dimension changes / initialized=true.
  const measured = useStore(s => Array.from(s.nodeLookup.values()).filter(n => !n.hidden).map(n => `${n.id}:${n.measured.width ?? 0}:${n.measured.height ?? 0}:${n.internals.positionAbsolute.x}:${n.internals.positionAbsolute.y}`).join('|'));
  useEffect(() => {
    const element = container.current;
    if (!visible || !viewportInitialized || !element) return;
    let frame: number | null = null;
    const fit = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        if (manual.current) return;
        const current = store.getState();
        const pane = element.querySelector<HTMLElement>('.react-flow__renderer');
        if (!current.panZoom || !pane || current.width <= 0 || current.height <= 0 || pane.clientWidth <= 0 || pane.clientHeight <= 0 || Math.abs(current.width - pane.clientWidth) > 2 || Math.abs(current.height - pane.clientHeight) > 2) return;
        const nodes = getNodes().filter(n => !n.hidden);
        if (!nodes.length || nodes.some(n => { const size = getInternalNode(n.id)?.measured; return !size || !Number.isFinite(size.width) || !Number.isFinite(size.height) || !(size.width! > 0) || !(size.height! > 0); })) return;
        const bounds = getNodesBounds(nodes);
        if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) return;
        // In the pinned library, duration:0 fitBounds calls the viewport transform
        // directly in this frame. No fitView node queue or completion callback can
        // later replay automatic work over a manual viewport. A resolved promise
        // is not treated as proof of geometry.
        void fitBounds(bounds, { duration: 0, padding: 0.15 });
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element); fit();
    return () => { observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame); };
  }, [visible, viewportInitialized, width, height, measured, fitBounds, getNodes, getInternalNode, getNodesBounds, store, container, manual]);
  return null;
}
