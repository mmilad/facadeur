import type { AppService } from '../../app-service';
import type { EditorSession } from '../../domain/session';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import { isDesignDomain, isEditorSurfaceId, type EditorSurface } from '../design/design-domain';

/** Coordinates root-only navigation and delegates editor operations to AppService. */
export function createEditorEventHandler(options: {
  app: AppService;
  session: EditorSession;
  getSurface?: () => EditorSurface;
  navigate?: (surface: EditorSurface) => void;
}) {
  const getSurface = options.getSurface ?? (() => 'editor');

  return (event: EditorEvent) => {
    if (event.type === EditorEventType.SurfaceNavigate) {
      if (options.navigate && isEditorSurfaceId(event.data.surfaceId)) {
        options.navigate(event.data.surfaceId);
      }
      return;
    }

    if (event.type === EditorEventType.AssetOpen) {
      if (isDesignDomain(getSurface())) options.navigate?.('editor');
      options.session.openAsset(event.data.assetId, 'root');
      return;
    }

    if (event.type === EditorEventType.AssetCreate) {
      void options.app
        .createAsset(event.data.kind)
        .then((assetId) => {
          if (assetId) options.session.openAsset(assetId, 'root');
        })
        .catch((failure) => {
          void options.app.dispatchEditorEvent({
            type: EditorEventType.NoticeSet,
            data: {
              text: failure instanceof Error ? failure.message : 'Could not create catalog asset',
              tone: 'error',
            },
          });
        });
      return;
    }

    void options.app.dispatchEditorEvent(event);
  };
}
