import { useEffect } from 'react';
import type { RefObject } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';

/** Viewport only. Initial/revealed/resized layout may fit until the user pans or
 * zooms; manual intent persists until the existing explicit Fit View action. */
export function TopologyViewport({ visible, container, manual }: { visible: boolean; container: RefObject<HTMLDivElement | null>; manual: RefObject<boolean> }) {
  const ready = useNodesInitialized();
  const { fitView, viewportInitialized } = useReactFlow();
  useEffect(() => {
    const element = container.current;
    if (!visible || !ready || !viewportInitialized || !element) return;
    let frame: number | null = null;
    const fit = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        const size = element.getBoundingClientRect();
        if (!manual.current && size.width > 0 && size.height > 0) void fitView({ duration: 0, padding: 0.15 });
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(element); fit();
    return () => { observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame); };
  }, [visible, ready, viewportInitialized, fitView, container, manual]);
  return null;
}
