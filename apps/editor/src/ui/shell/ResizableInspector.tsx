import { useCallback, useRef, type ReactNode } from 'react';
import { useInspectorWidth } from './useInspectorWidth.js';

export function ResizableInspector({ children }: { children: ReactNode }) {
  const { width, persist, minWidth, maxWidth } = useInspectorWidth();
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(width);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      dragging.current = true;
      startX.current = event.clientX;
      startWidth.current = width;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.classList.add('is-resizing-inspector');
    },
    [width],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const delta = startX.current - event.clientX;
      persist(startWidth.current + delta);
    },
    [persist],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.classList.remove('is-resizing-inspector');
  }, []);

  return (
    <aside
      className="side side-right inspector-rail"
      style={{ width, minWidth, maxWidth }}
      aria-label="Inspector"
    >
      <div
        className="inspector-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize inspector"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {children}
    </aside>
  );
}
