import type { EditorSession, EditorSnapshot } from '../../../domain/session.js';
import {
  editorBreakpoints,
  overrideLabel,
  viewportEditContext,
} from '../../../domain/viewport-edit.js';

export function ViewportEditBar({
  session,
  snap,
}: {
  session: EditorSession;
  snap: EditorSnapshot;
}) {
  const ctx = viewportEditContext({
    breakpoints: editorBreakpoints(snap.document, snap.design),
    focusId: snap.focusViewportId,
    editTarget: snap.editTarget,
  });
  const writingViewport = ctx.writingBreakpointId !== null;
  const viewportLabel = ctx.overrideViewport
    ? `${ctx.overrideViewport.id} · ${ctx.overrideViewport.minWidth}`
    : ctx.focus
      ? `${ctx.focus.id} is Base`
      : 'Viewport';
  const focusText = ctx.focus
    ? `Focus ${ctx.focus.id} · ${ctx.focus.minWidth}`
    : 'Click a viewport to set the focus.';
  return (
    <div className="viewport-edit">
      <p className="meta">{focusText}</p>
      <div className="viewport-edit-row" role="group" aria-label="Style edit target">
        <button
          type="button"
          name="edit-base"
          className={writingViewport ? 'text-button' : 'text-button is-active'}
          aria-pressed={!writingViewport}
          onClick={() => session.setEditTarget('base')}
        >
          Base
        </button>
        <button
          type="button"
          name="edit-viewport"
          className={writingViewport ? 'text-button is-active' : 'text-button'}
          aria-pressed={writingViewport}
          disabled={!ctx.overrideViewport}
          title={
            ctx.overrideViewport
              ? `Write a min-width override at ${ctx.overrideViewport.minWidth}px`
              : 'The base viewport has no media query. Click a wider frame to override it.'
          }
          onClick={() => session.setEditTarget('viewport')}
        >
          {viewportLabel}
        </button>
      </div>
      <p className="meta">
        {writingViewport && ctx.overrideViewport
          ? `Style, layout, and tokens write only ${ctx.overrideViewport.id} (min-width ${ctx.overrideViewport.minWidth}). Other breakpoints stay as they are.`
          : 'Style, layout, and tokens edit Base, with no media query. Node style is always Base.'}
      </p>
    </div>
  );
}

export function OverrideCue({ minWidth, onReset }: { minWidth: number; onReset: () => void }) {
  return (
    <p className="override-cue">
      <span>{overrideLabel(minWidth)}</span>
      <button type="button" className="text-button" onClick={onReset}>
        Reset
      </button>
    </p>
  );
}
