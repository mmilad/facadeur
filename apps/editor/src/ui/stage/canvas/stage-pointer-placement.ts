import { createId, type FlatDocument, type NodeType } from '@facadeur/core';
import {
  dropParentId,
  emphasizeInsertLine,
  insertDraft,
  placementAllowed,
  placeInParent,
  prefersInsideFrame,
  refusalMessage,
  sameSlot,
  type Box,
  type InsertTool,
} from '../../../domain/editing';
import { overlayBox, pointInFrame, type OverlayBox } from '../../../domain/viewport/geometry';
import { dataIdSelector, type SelectionController } from '../../../domain/selection/selection';
import { documentChain, renderIdForNode } from '../../../domain/selection/selection-model';
import type { EditorDrag, EditorSession, EditorSnapshot } from '../../../domain/session';
import type { StageController } from '../../../domain/viewport/stage';
import type { ViewportBoard, ViewportFrame } from '../../../domain/viewport/board';

export interface StageDrop {
  parentId: string;
  index: number;
  line: OverlayBox;
}

export interface PlaceSubject {
  type: NodeType;
  instanceKind?: string;
}

export interface StageGesture {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  mode: 'insert' | 'reorder';
  nodeId: string | null;
}

export function gestureSubject(snap: EditorSnapshot, gesture: StageGesture): PlaceSubject | null {
  if (gesture.mode === 'insert') {
    if (snap.tool === 'select') return null;
    return { type: snap.tool };
  }
  if (!gesture.nodeId) return null;
  return nodeSubject(snap, gesture.nodeId);
}

export function dragSubject(snap: EditorSnapshot, drag: EditorDrag): PlaceSubject | null {
  if (drag.kind === 'asset') {
    const kind = snap.catalog.find((item) => item.id === drag.assetId)?.kind;
    return { type: 'instance', instanceKind: kind };
  }
  return nodeSubject(snap, drag.nodeId);
}

function nodeSubject(snap: EditorSnapshot, nodeId: string): PlaceSubject | null {
  const node = snap.document.nodes[nodeId];
  if (!node) return null;
  if (node.type !== 'instance') return { type: node.type };
  const kind = snap.catalog.find((item) => item.id === node.component)?.kind;
  return { type: 'instance', instanceKind: kind };
}

export function createStagePlacement({
  session,
  getBoard,
  selection,
  stage,
  stageElement,
  isNestedRenderedId,
}: {
  session: EditorSession;
  getBoard: () => ViewportBoard | null;
  selection: SelectionController;
  stage: StageController;
  stageElement: HTMLElement;
  isNestedRenderedId: (snap: EditorSnapshot, renderedId: string) => boolean;
}) {
  function measure(
    clientX: number,
    clientY: number,
    draggedId: string | null,
    subject: PlaceSubject,
  ): StageDrop | null {
    const board = getBoard();
    if (!board) return null;
    const frame = selection.frameAt(clientX, clientY);
    if (!frame) return null;
    const scale = stage.getScale() || 1;
    const frameRect = frame.host.element.getBoundingClientRect();
    const local = pointInFrame({ clientX, clientY, frame: frameRect, scale });
    if (!local) return null;
    const snap = session.getSnapshot();
    const hit = selection.hitAt(clientX, clientY);
    if (hit && isNestedRenderedId(snap, hit.id)) return null;
    const chain = hit
      ? documentChain(snap.document, hit.id, snap.paintRoot)
      : [snap.document.rootId];
    const into = hit ? insideHit(frame, hit.id, local, snap.document, snap.paintRoot) : false;
    const parentId = dropParentId(snap.document, chain, draggedId, into, (id) =>
      placementAllowed(snap.document, id, subject.type, subject.instanceKind),
    );
    if (!parentId) return null;
    const parent = snap.document.nodes[parentId];
    if (parent?.type !== 'frame') return null;
    const docEl = frame.host.contentDocument();
    const parentRender = renderIdForNode(snap.document, parentId, snap.paintRoot);
    const parentEl = parentRender ? docEl.querySelector(dataIdSelector(parentRender)) : docEl.body;
    if (!isElement(parentEl)) return null;
    const direction = parent.layout?.direction === 'row' ? 'row' : 'column';
    const siblings = parent.children.flatMap((id) => {
      if (id === draggedId) return [];
      const renderId = renderIdForNode(snap.document, id, snap.paintRoot);
      if (!renderId) return [];
      const el = docEl.querySelector(dataIdSelector(renderId));
      if (!isElement(el)) return [];
      return [{ id, rect: boxOf(el) }];
    });
    const placed = placeInParent({
      direction,
      pointer: local,
      parent: boxOf(parentEl),
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
    return { parentId, index: placed.index, line };
  }

  function placeTool(toolName: InsertTool, clientX: number, clientY: number, fromDrag: boolean) {
    const snap = session.getSnapshot();
    const hit = selection.hitAt(clientX, clientY);
    if (hit && isNestedRenderedId(snap, hit.id)) return;
    const chain = hit ? documentChain(snap.document, hit.id, snap.paintRoot) : [];
    const selected = snap.selectedNode;
    const append = !fromDrag && selected?.type === 'frame' && chain.includes(selected.id);
    const subject: PlaceSubject = { type: toolName };
    const drop = append ? null : measure(clientX, clientY, null, subject);
    const parentId = append && selected ? selected.id : drop?.parentId;
    const legal = parentId !== undefined && placementAllowed(snap.document, parentId, toolName);
    if (!parentId || !legal) {
      if (selection.frameAt(clientX, clientY)) {
        session.setNotice(refusalMessage(snap.document.kind, toolName));
      }
      return;
    }
    const id = createId();
    session.execute({
      type: 'insert',
      parentId,
      ...(append || !drop ? {} : { index: drop.index }),
      node: insertDraft(toolName, id),
    });
    if (session.getSnapshot().document.nodes[id]) session.selectNode(id);
  }

  function applyDrop(
    drag: EditorDrag,
    drop: StageDrop | null,
    clientX: number,
    clientY: number,
  ): boolean {
    const subject = dragSubject(session.getSnapshot(), drag);
    const resolved =
      drop ??
      (subject
        ? measure(clientX, clientY, drag.kind === 'node' ? drag.nodeId : null, subject)
        : null);
    if (!resolved) {
      if (subject && selection.frameAt(clientX, clientY)) {
        session.setNotice(
          refusalMessage(session.getSnapshot().document.kind, subject.type, subject.instanceKind),
        );
      }
      return false;
    }
    if (drag.kind === 'node') {
      const doc = session.getSnapshot().document;
      if (!sameSlot(doc, drag.nodeId, resolved.parentId, resolved.index)) {
        session.execute({
          type: 'move',
          nodeId: drag.nodeId,
          parentId: resolved.parentId,
          index: resolved.index,
        });
      }
      session.selectNode(drag.nodeId);
      return true;
    }
    const asset = session.getSnapshot().catalog.find((item) => item.id === drag.assetId);
    const id = createId();
    session.execute({
      type: 'insert',
      parentId: resolved.parentId,
      index: resolved.index,
      node: {
        id,
        type: 'instance',
        component: drag.assetId,
        ...(asset ? { name: asset.name } : {}),
      },
    });
    if (session.getSnapshot().document.nodes[id]) session.selectNode(id);
    return true;
  }

  function applyReorderDrop(nodeId: string, drop: StageDrop) {
    const snap = session.getSnapshot();
    if (!sameSlot(snap.document, nodeId, drop.parentId, drop.index)) {
      session.execute({
        type: 'move',
        nodeId,
        parentId: drop.parentId,
        index: drop.index,
      });
    }
    session.selectNode(nodeId);
  }

  return { measure, placeTool, applyDrop, applyReorderDrop };
}

function insideHit(
  frame: ViewportFrame,
  renderedId: string,
  pointer: { x: number; y: number },
  doc: FlatDocument,
  paintRoot: boolean,
): boolean {
  const chain = documentChain(doc, renderedId, paintRoot);
  const deepest = chain[chain.length - 1];
  if (!deepest) return false;
  const node = doc.nodes[deepest];
  if (node?.type !== 'frame') return false;
  const el = frame.host.contentDocument().querySelector(dataIdSelector(renderedId));
  if (!isElement(el)) return node.type === 'frame' && node.children.length === 0;
  const rect = boxOf(el);
  const empty = node.children.length === 0;
  return prefersInsideFrame(rect, pointer, empty);
}

function boxOf(el: HTMLElement): Box {
  const rect = el.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function isElement(value: unknown): value is HTMLElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nodeType' in value &&
    (value as Node).nodeType === Node.ELEMENT_NODE
  );
}
