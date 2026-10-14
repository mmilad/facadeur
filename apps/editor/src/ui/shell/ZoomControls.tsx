import { ZOOM_STEP_FACTOR } from '../../domain/viewport/stage';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';

export function ZoomControls({
  onEvent,
  label,
}: {
  onEvent: (event: EditorEvent) => void;
  label: string;
}) {
  return (
    <div className="zoom-controls" role="group" aria-label="Zoom">
      <button
        type="button"
        className="zoom-step"
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() =>
          onEvent({
            type: EditorEventType.ZoomBy,
            data: { factor: 1 / ZOOM_STEP_FACTOR },
          })
        }
      >
        −
      </button>
      <button
        type="button"
        className="zoom-readout"
        aria-live="polite"
        aria-label="Zoom to 100%"
        title="Zoom to 100%"
        onClick={() => onEvent({ type: EditorEventType.ZoomReset, data: {} })}
      >
        {label}
      </button>
      <button
        type="button"
        className="zoom-step"
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() =>
          onEvent({ type: EditorEventType.ZoomBy, data: { factor: ZOOM_STEP_FACTOR } })
        }
      >
        +
      </button>
    </div>
  );
}
