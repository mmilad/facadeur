import {
  canAcceptCatalogChildren,
  createCatalogUuid,
  defaultNestingRules,
  findNodeByUuid,
  findParentOfNode,
  isInsideCatalogSubtree,
} from '@facadeur/core';
import type { AppService } from '../../../app-service/AppService';
import {
  emphasizeInsertLine,
  placeInParent,
  type Box,
  type InsertTool,
} from '../../../domain/editing';
import { catalogNodeFromInsertEntry } from '../../../domain/catalog/layer-node-draft';
import { catalogPlacementAllowed } from '../../../domain/catalog/catalog-layer-insert';
import { catalogNodeUuidForRenderedHit } from '../../../domain/catalog/rendered-hit';
import type { LayerInsertEntry } from '../../../domain/catalog/catalog-layer-insert';
import { overlayBox, pointInFrame, type OverlayBox } from '../../../domain/viewport/geometry';
import { type SelectionController } from '../../../domain/selection/selection';
import type { EditorDrag, EditorSession } from '../../../domain/session';
import type { StageController } from '../../../domain/viewport/stage';
import type { ViewportBoard } from '../../../domain/viewport/board';

export interface StageDrop {
  parentUuid: string;
  index: number;
  line: OverlayBox;
}

export function createStagePlacement({
  app,
  session,
  getBoard,
  selection,
  stage,
  stageElement,
}: {
  app: AppService;
  session: EditorSession;
  getBoard: () => ViewportBoard | null;
  selection: SelectionController;
  stage: StageController;
  stageElement: HTMLElement;
}) {
  function measure(clientX: number, clientY: number, draggedUuid: string | null): StageDrop | null {
    const board = getBoard();
    const definition = app.getCoreSnapshot().openDefinition;
    if (!board || !definition) return null;
    const frame = selection.frameAt(clientX, clientY);
    if (!frame) return null;
    const scale = stage.getScale() || 1;
    const frameRect = frame.host.element.getBoundingClientRect();
    const local = pointInFrame({ clientX, clientY, frame: frameRect, scale });
    if (!local) return null;
    const hit = selection.hitAt(clientX, clientY);
    const targetUuid = catalogNodeUuidForRenderedHit(
      frame,
      hit ? nodeUuidFromHit(hit.id) : null,
      definition.root,
    );
    const target = targetUuid ? findNodeByUuid(definition.root, targetUuid) : definition.root;
    const parentInfo = targetUuid ? findParentOfNode(definition.root, targetUuid) : null;
    const parent = target && canAcceptCatalogChildren(target) ? target : parentInfo?.parent;
    if (
      !parent ||
      (draggedUuid && isInsideCatalogSubtree(definition.root, draggedUuid, parent.uuid))
    )
      return null;

    const nodesByUuid = new Map(board.renderedNodes(frame).map((entry) => [entry.uuid, entry]));
    const children = parent.dom.children ?? [];
    const siblings = children.flatMap((node) => {
      if (node.uuid === draggedUuid) return [];
      const rendered = nodesByUuid.get(node.uuid);
      return rendered ? [{ id: node.uuid, rect: rendered.rect }] : [];
    });
    const parentBox =
      nodesByUuid.get(parent.uuid)?.rect ?? boxOf(frame.host.contentDocument().body);
    const placed = placeInParent({
      direction:
        parent.style?.display === 'flex' && parent.style?.['flex-direction'] === 'row'
          ? 'row'
          : 'column',
      pointer: local,
      parent: parentBox,
      siblings,
    });
    const readable = emphasizeInsertLine(placed.line, scale);
    const line = overlayBox({
      element: {
        left: readable.left,
        top: readable.top,
        width: readable.width,
        height: readable.height,
      },
      frame: frameRect,
      stage: stageElement.getBoundingClientRect(),
      scale,
    });
    return { parentUuid: parent.uuid, index: placed.index, line };
  }

  function placeTool(toolName: InsertTool, clientX: number, clientY: number) {
    const definition = app.getCoreSnapshot().openDefinition;
    if (!definition) return;
    const drop = measure(clientX, clientY, null);
    const parentUuid = drop?.parentUuid ?? definition.root.uuid;
    const parent = findNodeByUuid(definition.root, parentUuid);
    const rule = defaultNestingRules[definition.kind];
    if (!parent || !rule.nodeTypes.includes(toolName)) {
      if (selection.frameAt(clientX, clientY)) {
        session.setNotice(`${definition.kind} cannot contain a ${toolName}.`, 'error');
      }
      return;
    }
    const uuid = createCatalogUuid();
    const node =
      toolName === 'frame'
        ? { uuid, name: 'layer', dom: { tagName: 'div', children: [] } }
        : toolName === 'text'
          ? { uuid, name: 'Text', dom: { tagName: 'span', text: 'Text' } }
          : {
              uuid,
              name: 'Image',
              dom: { tagName: 'img', attributes: { alt: '', src: '' } },
              style: { width: '120px', height: '80px' },
            };
    app.insertCatalogNode(parentUuid, drop?.index ?? (parent.dom.children ?? []).length, node);
    session.selectNode(node.uuid);
    void app.persistCatalog().catch((failure: unknown) => {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not save catalog edit',
        'error',
      );
    });
  }

  function applyDrop(drag: EditorDrag, drop: StageDrop | null): boolean {
    const definition = app.getCoreSnapshot().openDefinition;
    if (!definition) return false;
    if (drag.kind === 'node') {
      if (!drop || definition.root.uuid === drag.nodeId) return false;
      app.moveCatalogNode(drag.nodeId, drop.parentUuid, drop.index);
      session.selectNode(drag.nodeId);
    } else {
      const asset = session.getSnapshot().catalog.find((item) => item.id === drag.assetId);
      if (!asset || !drop) return false;
      const entry: LayerInsertEntry = { kind: 'instance', assetId: asset.id, label: asset.name };
      const parent = findNodeByUuid(definition.root, drop.parentUuid);
      if (
        !parent ||
        !catalogPlacementAllowed(definition.kind, parent, entry, session.getSnapshot().catalog)
      )
        return false;
      const node = catalogNodeFromInsertEntry(entry);
      if (!node) return false;
      app.insertCatalogNode(drop.parentUuid, drop.index, node);
      session.selectNode(node.uuid);
    }
    void app.persistCatalog().catch((failure: unknown) => {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not save catalog edit',
        'error',
      );
    });
    return true;
  }

  function applyReorderDrop(nodeUuid: string, drop: StageDrop) {
    const definition = app.getCoreSnapshot().openDefinition;
    if (!definition) return;
    app.moveCatalogNode(nodeUuid, drop.parentUuid, drop.index);
    session.selectNode(nodeUuid);
    void app.persistCatalog().catch((failure: unknown) => {
      session.setNotice(
        failure instanceof Error ? failure.message : 'Could not save catalog edit',
        'error',
      );
    });
  }

  return { measure, placeTool, applyDrop, applyReorderDrop };
}

export function nodeUuidFromHit(id: string): string | null {
  return id.startsWith('node:') ? id.slice('node:'.length) : null;
}

function boxOf(el: HTMLElement): Box {
  const rect = el.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}
