import { ZOOM_STEP_FACTOR } from '../../domain/viewport/stage';
import type { EditorSession } from '../../domain/session';

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
      <button
        type="button"
        className="zoom-readout"
        aria-live="polite"
        aria-label="Zoom to 100%"
        title="Zoom to 100%"
        onClick={() => session.resetZoom()}
      >
        {label}
      </button>
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
