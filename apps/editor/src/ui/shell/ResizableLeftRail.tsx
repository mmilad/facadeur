import { useCallback, useRef, type ReactNode } from 'react';
import {
  LEFT_RAIL_MIN_LAYERS_PX,
  LEFT_RAIL_MIN_PROJECT_PX,
  LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT,
  LEFT_RAIL_SPLIT_HANDLE_PX,
  useLeftRailSplit,
} from './useLeftRailSplit.js';

export function ResizableLeftRail({ project, layers }: { project: ReactNode; layers: ReactNode }) {
  const {
    projectRatio,
    persistRatio,
    projectCollapsed,
    collapseProject,
    expandProject,
    minRatio,
    maxRatio,
  } = useLeftRailSplit();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startRatio = useRef(projectRatio);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || projectCollapsed) return;
      dragging.current = true;
      startY.current = event.clientY;
      startRatio.current = projectRatio;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.classList.add('is-resizing-left-rail');
    },
    [projectCollapsed, projectRatio],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const available = rect.height - LEFT_RAIL_SPLIT_HANDLE_PX;
      if (available <= 0) return;
      const projectPx = event.clientY - rect.top;
      const clamped = Math.min(
        available - LEFT_RAIL_MIN_LAYERS_PX,
        Math.max(LEFT_RAIL_MIN_PROJECT_PX, projectPx),
      );
      const ratio = clamped / available;
      persistRatio(Math.min(maxRatio, Math.max(minRatio, ratio)));
    },
    [maxRatio, minRatio, persistRatio],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.classList.remove('is-resizing-left-rail');
  }, []);

  const gridTemplateRows = projectCollapsed
    ? `${LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT}px 1fr`
    : `${projectRatio}fr ${LEFT_RAIL_SPLIT_HANDLE_PX}px ${1 - projectRatio}fr`;

  return (
    <div
      ref={containerRef}
      className="left-rail-split"
      style={{ gridTemplateRows }}
      data-project-collapsed={projectCollapsed ? 'true' : 'false'}
    >
      <div className="left-rail-pane left-rail-pane-project">
        {projectCollapsed ? (
          <button
            type="button"
            className="left-rail-project-strip"
            aria-expanded={false}
            aria-label="Expand project panel"
            onClick={expandProject}
          >
            <span className="left-rail-strip-label">Project</span>
            <span className="left-rail-strip-chevron" aria-hidden="true">
              ▸
            </span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className="left-rail-collapse"
              aria-expanded={true}
              aria-label="Collapse project panel"
              title="Collapse project"
              onClick={collapseProject}
            >
              <span aria-hidden="true">▴</span>
            </button>
            {project}
          </>
        )}
      </div>
      {!projectCollapsed ? (
        <div
          className="left-rail-split-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize project and layers"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ) : null}
      <div className="left-rail-pane left-rail-pane-layers">{layers}</div>
    </div>
  );
}
