import { ZOOM_STEP_FACTOR } from '../../domain/stage.js';
import type { EditorSession } from '../../domain/session.js';

export function ZoomControls({ session, label }: { session: EditorSession; label: string }) {
  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <button
        type="button"
        className="zoom-step"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => session.zoomBy(1 / ZOOM_STEP_FACTOR)}
      >
        −
      </button>
      <span className="zoom-readout" aria-live="polite">
        {label}
      </span>
      <button
        type="button"
        className="zoom-step"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => session.zoomBy(ZOOM_STEP_FACTOR)}
      >
        +
      </button>
    </div>
  );
}
