import { useCallback, useRef, type ReactNode } from 'react';
import {
  LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT,
  LEFT_RAIL_SPLIT_HANDLE_PX,
  projectRatioFromPointer,
  useLeftRailSplit,
} from './useLeftRailSplit';

export function ResizableLeftRail({ project, layers }: { project: ReactNode; layers: ReactNode }) {
  const { projectRatio, persistRatio, projectCollapsed, collapseProject, expandProject } =
    useLeftRailSplit();
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || projectCollapsed) return;
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.classList.add('is-resizing-left-rail');
    },
    [projectCollapsed],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = projectRatioFromPointer(event.clientY, rect.top, rect.bottom);
      if (ratio !== undefined) persistRatio(ratio);
    },
    [persistRatio],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    document.body.classList.remove('is-resizing-left-rail');
  }, []);

  const gridTemplateRows = projectCollapsed
    ? `1fr ${LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT}px`
    : `${1 - projectRatio}fr ${LEFT_RAIL_SPLIT_HANDLE_PX}px ${projectRatio}fr`;

  return (
    <div
      ref={containerRef}
      className="left-rail-split"
      style={{ gridTemplateRows }}
      data-project-collapsed={projectCollapsed ? 'true' : 'false'}
    >
      <div className="left-rail-pane left-rail-pane-layers">{layers}</div>
      {!projectCollapsed ? (
        <div
          className="left-rail-split-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize layers and project"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ) : null}
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
              <span aria-hidden="true">▾</span>
            </button>
            {project}
          </>
        )}
      </div>
    </div>
  );
}
