import { useEffect } from 'react';
import type { EditorSession } from '../domain/session';
import type { EditorEvent } from '../domain/sidebar/events';
import { EditorEventType } from '../domain/sidebar/events';
import { isEditableTarget } from '../domain/keyboard';

export function useEditorKeys({
  session,
  canvasActive,
  onEvent,
}: {
  session: EditorSession;
  canvasActive: boolean;
  onEvent: (event: EditorEvent) => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || !canvasActive) return;
      const key = event.key.toLowerCase();

      if (key === 'delete' || key === 'backspace') {
        const snap = session.getSnapshot();
        const nodeId = snap.selectedCatalogNodeUuid;
        const rootId = snap.openDefinition?.root.uuid;
        if (!nodeId || !rootId || nodeId === rootId) return;
        event.preventDefault();
        onEvent({ type: EditorEventType.LayerDelete, data: { nodeId } });
        return;
      }

      if (key === 'escape') {
        const snap = session.getSnapshot();
        if (snap.tool !== 'select') {
          onEvent({ type: EditorEventType.ToolSet, data: { tool: 'select' } });
        } else if (snap.selectedCatalogNodeUuid) {
          onEvent({ type: EditorEventType.LayerSelectParent, data: {} });
        }
        return;
      }

      if (key === 'g' && event.altKey && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        const nodeId = session.getSnapshot().selectedCatalogNodeUuid;
        if (!nodeId) return;
        event.preventDefault();
        onEvent({ type: EditorEventType.LayerWrap, data: { nodeId } });
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tool = key === 'f' ? 'frame' : key === 't' ? 'text' : key === 'i' ? 'image' : null;
      if (tool) {
        onEvent({ type: EditorEventType.ToolSet, data: { tool } });
      } else if (key === 'v') {
        onEvent({ type: EditorEventType.ToolSet, data: { tool: 'select' } });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canvasActive, onEvent, session]);
}
