import type { EditorSession, EditorSnapshot } from '../../domain/session.js';
import { editorBreakpoints, viewportEditContext } from '../../domain/viewport/viewport-edit.js';

/** Design edits choose their breakpoint without selecting canvas preview chrome. */
export function DesignBreakpointControl({
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
  return (
    <label className="design-breakpoint-control">
      <span>Editing</span>
      <select
        className="eu-control"
        aria-label="Token breakpoint"
        value={ctx.writingBreakpointId ?? ''}
        onChange={(event) => {
          const id = event.target.value;
          if (id) session.setFocusViewport(id);
          session.setEditTarget(id ? 'viewport' : 'base');
        }}
      >
        <option value="">Base</option>
        {ctx.breakpoints
          .filter((item) => item.id !== ctx.base?.id)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.id} · {item.minWidth}px and wider
            </option>
          ))}
      </select>
    </label>
  );
}
