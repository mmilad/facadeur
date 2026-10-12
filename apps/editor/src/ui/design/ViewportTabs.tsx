import { breakpointLabel, type Breakpoint } from '@facadeur/core';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';

/** Breakpoint tabs for the token list. The narrowest viewport writes the base layer. */
export function ViewportTabs({
  onEvent,
  breakpoints,
  baseId,
  writingId,
}: {
  onEvent: (event: EditorEvent) => void;
  breakpoints: readonly Breakpoint[];
  baseId: string | null;
  writingId: string | null;
}) {
  const select = (id: string) => {
    onEvent({ type: EditorEventType.ViewportFocus, data: { breakpointId: id } });
    onEvent({
      type: EditorEventType.EditTargetSet,
      data: { target: id === baseId ? 'base' : 'viewport' },
    });
  };
  return (
    <div className="design-viewport-tabs" role="tablist" aria-label="Viewports">
      {breakpoints.map((item) => {
        const base = item.uuid === baseId;
        const selected = base ? writingId === null : writingId === item.uuid;
        return (
          <button
            key={item.uuid}
            type="button"
            role="tab"
            className={selected ? 'design-viewport-tab is-active' : 'design-viewport-tab'}
            aria-selected={selected}
            data-viewport-tab={item.uuid}
            onClick={() => select(item.uuid)}
          >
            <span>{breakpointLabel(item)}</span>
            <small>{base ? 'Base' : `${item.minWidth}px and wider`}</small>
          </button>
        );
      })}
    </div>
  );
}
