import {
  canAcceptCatalogChildren,
  findNodeByUuid,
  findParentOfNode,
  isInsideCatalogSubtree,
  type NodeDefinitionModel,
  type NodeModel,
} from '@facadeur/core';
import type { DropZone } from '../editing';

function indexAfterRemoval(
  childIds: readonly string[],
  draggedId: string,
  rawIndex: number,
): number {
  const without = childIds.filter((id) => id !== draggedId);
  if (rawIndex >= childIds.length) return without.length;
  const beforeId = childIds[rawIndex];
  if (!beforeId || beforeId === draggedId) {
    for (let i = rawIndex; i < childIds.length; i += 1) {
      const id = childIds[i];
      if (!id || id === draggedId) continue;
      const index = without.indexOf(id);
      return index === -1 ? without.length : index;
    }
    return without.length;
  }
  const index = without.indexOf(beforeId);
  return index === -1 ? without.length : index;
}

export function catalogLayerInsertAt(
  root: NodeModel,
  targetUuid: string,
  zone: DropZone,
): { parentUuid: string; index: number } | null {
  if (zone === 'inside') {
    const target = findNodeByUuid(root, targetUuid);
    if (!target || !canAcceptCatalogChildren(target)) return null;
    return { parentUuid: targetUuid, index: (target.dom.children ?? []).length };
  }
  const parentInfo = findParentOfNode(root, targetUuid);
  if (!parentInfo) return null;
  const index = parentInfo.index;
  return {
    parentUuid: parentInfo.parent.uuid,
    index: zone === 'before' ? index : index + 1,
  };
}

export function catalogLayerDropTarget(
  definition: NodeDefinitionModel,
  draggedUuid: string,
  targetUuid: string,
  zone: DropZone,
): { parentUuid: string; index: number } | null {
  if (draggedUuid === targetUuid) return null;
  if (isInsideCatalogSubtree(definition.root, draggedUuid, targetUuid)) return null;
  const spot = catalogLayerInsertAt(definition.root, targetUuid, zone);
  if (!spot) return null;
  const parent = findNodeByUuid(definition.root, spot.parentUuid);
  if (!parent) return null;
  const childIds = (parent.dom.children ?? []).map((child) => child.uuid);
  return {
    parentUuid: spot.parentUuid,
    index: indexAfterRemoval(childIds, draggedUuid, spot.index),
  };
}

export function catalogLayerDropLegal(
  definition: NodeDefinitionModel,
  draggedUuid: string,
  targetUuid: string,
  zone: DropZone,
): boolean {
  if (definition.root.uuid === draggedUuid) return false;
  return catalogLayerDropTarget(definition, draggedUuid, targetUuid, zone) !== null;
}
