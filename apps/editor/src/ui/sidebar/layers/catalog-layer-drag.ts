import type { DragEvent } from 'react';
import type { AppService } from '../../../app-service';
import { catalogLayerDropTarget, catalogLayerDropLegal } from '../../../domain/catalog/catalog-layer-move';
import type { DropZone } from '../../../domain/editing';
import type { LayerItem } from '../../../domain/selection/selection-model';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';

export function layerDropZoneFor(event: DragEvent, item: LayerItem): DropZone {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
  const canInside = item.type === 'frame' || item.type === 'instance';
  if (canInside && ratio > 0.28 && ratio < 0.72) return 'inside';
  return ratio < 0.5 ? 'before' : 'after';
}

export function catalogNodeDragLegal(
  snap: EditorSnapshot,
  draggedUuid: string,
  targetItem: LayerItem,
  zone: DropZone,
): boolean {
  const definition = snap.openDefinition;
  if (!definition) return false;
  return catalogLayerDropLegal(definition, draggedUuid, targetItem.id, zone);
}

export async function dropCatalogLayerNode(
  app: AppService,
  session: EditorSession,
  draggedUuid: string,
  targetItem: LayerItem,
  zone: DropZone,
): Promise<void> {
  const definition = session.getSnapshot().openDefinition;
  if (!definition) return;
  const target = catalogLayerDropTarget(definition, draggedUuid, targetItem.id, zone);
  if (!target) return;
  app.core.moveCatalogNode(draggedUuid, target.parentUuid, target.index);
  await app.persistCatalog();
  session.selectNode(draggedUuid);
}
