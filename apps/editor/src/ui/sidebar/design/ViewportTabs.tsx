import { breakpointLabel, type Breakpoint } from '@facadeur/core';
import type { EditorSession } from '../../../domain/session';

/** Breakpoint tabs for the token list. The narrowest viewport writes the base layer. */
export function ViewportTabs({
  session,
  breakpoints,
  baseId,
  writingId,
}: {
  session: EditorSession;
  breakpoints: readonly Breakpoint[];
  baseId: string | null;
  writingId: string | null;
}) {
  const select = (id: string) => {
    session.setFocusViewport(id);
    session.setEditTarget(id === baseId ? 'base' : 'viewport');
  };
  return (
    <div className="design-viewport-tabs" role="tablist" aria-label="Viewports">
      {breakpoints.map((item) => {
        const base = item.id === baseId;
        const selected = base ? writingId === null : writingId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={selected ? 'design-viewport-tab is-active' : 'design-viewport-tab'}
            aria-selected={selected}
            data-viewport-tab={item.id}
            onClick={() => select(item.id)}
          >
            <span>{breakpointLabel(item)}</span>
            <small>{base ? 'Base' : `${item.minWidth}px and wider`}</small>
          </button>
        );
      })}
    </div>
  );
}
