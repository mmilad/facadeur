import { createId, type FlatDocument, type NodeType } from '@facadeur/core';
import { useEffect, useRef } from 'react';
import {
  dropParentId,
  emphasizeInsertLine,
  insertDraft,
  placementAllowed,
  placeInParent,
  prefersInsideFrame,
  insertModeCue,
  isInsertTool,
  refusalMessage,
  sameSlot,
  writeLayoutFields,
  type Box,
  type InsertTool,
} from '../../domain/editing.js';
import { overlayBox, pointInFrame, type OverlayBox } from '../../domain/geometry.js';
import { isEditableTarget } from '../../domain/keyboard.js';
import {
  dataIdSelector,
  createSelection,
  type SelectionController,
} from '../../domain/selection.js';
import {
  documentChain,
  instanceOpenTarget,
  renderIdForNode,
  resolveClick,
  type SelectMode,
} from '../../domain/selection-model.js';
import type {
  EditorDrag,
  EditorSession,
  EditorSnapshot,
  EditorTool,
} from '../../domain/session.js';
import { createStage, type StageController } from '../../domain/stage.js';
import {
  createViewportBoard,
  type ViewportBoard,
  type ViewportFrame,
} from '../../domain/viewports.js';

export function StageCanvas({
  session,
  openId,
  generation,
  designRevision,
  selectedRenderId,
  focusViewportId,
  selectedViewportId,
  chromeRevision,
  tool,
}: {
  session: EditorSession;
  openId: string;
  generation: number;
  designRevision: number;
  selectedRenderId: string | null;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  chromeRevision: number;
  tool: EditorTool;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<ViewportBoard | null>(null);
  const selectionRef = useRef<SelectionController | null>(null);
  const stageControllerRef = useRef<StageController | null>(null);
  const untouchedRef = useRef(true);
  const fitRef = useRef<() => void>(() => {});

  useEffect(() => {
    const viewport = viewportRef.current;
    const stageEl = stageRef.current;
    if (!viewport || !stageEl) return;
    const stageElement = stageEl;

    const stage = createStage(viewport, stageEl);
    stageControllerRef.current = stage;
    const selection = createSelection({
      stage: stageEl,
      getScale: () => stage.getScale(),
      frames: () => boardRef.current?.frames() ?? [],
    });
    selectionRef.current = selection;

    let pending: Drop | null = null;
    let gesture: Gesture | null = null;
    let lastClick = { time: 0, x: 0, y: 0 };

    const stopZoom = stage.onChange(({ scale }) => {
      session.setZoom(scale);
      selection.reposition();
    });
    const stopClick = stage.onClick((event) => {
      const snap = session.getSnapshot();
      if (snap.tool !== 'select') return;
      choose(event, event.ctrlKey || event.metaKey ? 'deepest' : 'context');
    });

    stage.setClaimsPan((event) => claimsPan(event));

    function claimsPan(event: PointerEvent): boolean {
      if (event.button !== 0) return true;
      const snap = session.getSnapshot();
      if (snap.tool !== 'select') return false;
      const hit = selection.hitAt(event.clientX, event.clientY);
      if (!hit) return true;
      const chain = documentChain(snap.document, hit.id, snap.paintRoot);
      const target = resolveClick({
        doc: snap.document,
        chain,
        selectedId: snap.selectedNodeId,
        mode: 'context',
      });
      return !target || target === snap.document.rootId;
    }

    function choose(event: { clientX: number; clientY: number }, mode: SelectMode) {
      const snap = session.getSnapshot();
      const hit = selection.hitAt(event.clientX, event.clientY);
      const chain = hit ? documentChain(snap.document, hit.id, snap.paintRoot) : [];
      const target = resolveClick({
        doc: snap.document,
        chain,
        selectedId: snap.selectedNodeId,
        mode,
      });
      session.selectNode(target);
    }

    function measure(
      clientX: number,
      clientY: number,
      draggedId: string | null,
      subject: PlaceSubject,
    ): Drop | null {
      const board = boardRef.current;
      if (!board) return null;
      const frame = selection.frameAt(clientX, clientY);
      if (!frame) return null;
      const scale = stage.getScale() || 1;
      const frameRect = frame.host.element.getBoundingClientRect();
      const local = pointInFrame({ clientX, clientY, frame: frameRect, scale });
      if (!local) return null;
      const snap = session.getSnapshot();
      const hit = selection.hitAt(clientX, clientY);
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
      const parentEl = parentRender
        ? docEl.querySelector(dataIdSelector(parentRender))
        : docEl.body;
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

    function readOffset(nodeId: string): { x: number; y: number } {
      const snap = session.getSnapshot();
      const renderId = renderIdForNode(snap.document, nodeId, snap.paintRoot);
      const frame = boardRef.current?.frames()[0];
      if (!renderId || !frame) return { x: 0, y: 0 };
      const el = frame.host.contentDocument().querySelector(dataIdSelector(renderId));
      if (!isElement(el)) return { x: 0, y: 0 };
      return { x: el.offsetLeft, y: el.offsetTop };
    }

    const onPointerMove = (event: PointerEvent) => {
      if (stage.isPanning()) {
        selection.clearHover();
        selection.showInsert(null);
        return;
      }
      if (gesture && gesture.pointerId === event.pointerId) {
        const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
        if (!gesture.moved && distance < 4) return;
        gesture.moved = true;
        selection.clearHover();
        const ignore = gesture.mode === 'reorder' ? gesture.nodeId : null;
        const subject = gestureSubject(session.getSnapshot(), gesture);
        pending = subject ? measure(event.clientX, event.clientY, ignore, subject) : null;
        selection.showInsert(pending?.line ?? null);
        return;
      }
      if (session.getSnapshot().drag) return;
      const hit = selection.hitAt(event.clientX, event.clientY);
      const frame = selection.frameAt(event.clientX, event.clientY);
      if (!hit || !frame) {
        selection.hoverRendered(null, null);
        return;
      }
      const snap = session.getSnapshot();
      const chain = documentChain(snap.document, hit.id, snap.paintRoot);
      const mode = event.ctrlKey || event.metaKey ? 'deepest' : 'context';
      const target = resolveClick({
        doc: snap.document,
        chain,
        selectedId: snap.selectedNodeId,
        mode,
      });
      const renderId = target ? renderIdForNode(snap.document, target, snap.paintRoot) : null;
      selection.hoverRendered(renderId, frame.host.id);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const frame = selection.frameAt(event.clientX, event.clientY);
      if (frame && claimsPan(event)) {
        session.selectViewport(frame.breakpoint.id);
        return;
      }
      if (frame) session.setFocusViewport(frame.breakpoint.id);
      if (claimsPan(event)) return;
      const snap = session.getSnapshot();
      const hit = selection.hitAt(event.clientX, event.clientY);
      const chain = hit ? documentChain(snap.document, hit.id, snap.paintRoot) : [];
      const target = resolveClick({
        doc: snap.document,
        chain,
        selectedId: snap.selectedNodeId,
        mode: 'context',
      });
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        mode: snap.tool === 'select' ? 'reorder' : 'insert',
        nodeId: snap.tool === 'select' ? target : null,
      };
      viewport.setPointerCapture(event.pointerId);
    };

    const endGesture = (event: PointerEvent) => {
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const current = gesture;
      gesture = null;
      if (viewport.hasPointerCapture(event.pointerId))
        viewport.releasePointerCapture(event.pointerId);
      selection.showInsert(null);
      const snap = session.getSnapshot();
      if (!current.moved) {
        if (snap.tool === 'frame' || snap.tool === 'text' || snap.tool === 'image') {
          placeTool(snap.tool, event.clientX, event.clientY, false);
          return;
        }
        const now = performance.now();
        const distance = Math.hypot(event.clientX - lastClick.x, event.clientY - lastClick.y);
        const deeper = now - lastClick.time < 400 && distance < 4;
        lastClick = { time: now, x: event.clientX, y: event.clientY };
        const mode: SelectMode =
          event.ctrlKey || event.metaKey ? 'deepest' : deeper ? 'deeper' : 'context';
        if (mode === 'deeper') {
          const hit = selection.hitAt(event.clientX, event.clientY);
          const chain = hit ? documentChain(snap.document, hit.id, snap.paintRoot) : [];
          const componentId = instanceOpenTarget(snap.document, chain, snap.selectedNodeId);
          if (componentId) {
            session.drillToMaster(componentId);
            return;
          }
        }
        choose(event, mode);
        return;
      }
      const drop = pending;
      pending = null;
      if (!drop) return;
      if (current.mode === 'reorder' && current.nodeId) {
        if (!sameSlot(snap.document, current.nodeId, drop.parentId, drop.index)) {
          session.execute({
            type: 'move',
            nodeId: current.nodeId,
            parentId: drop.parentId,
            index: drop.index,
          });
        }
        session.selectNode(current.nodeId);
        return;
      }
      if (snap.tool === 'frame' || snap.tool === 'text' || snap.tool === 'image') {
        placeTool(snap.tool, event.clientX, event.clientY, true);
      }
    };

    const onDragOver = (event: DragEvent) => {
      const drag = session.getSnapshot().drag;
      if (!drag) return;
      event.preventDefault();
      if (event.dataTransfer)
        event.dataTransfer.dropEffect = drag.kind === 'node' ? 'move' : 'copy';
      const ignore = drag.kind === 'node' ? drag.nodeId : null;
      const subject = dragSubject(session.getSnapshot(), drag);
      pending = subject ? measure(event.clientX, event.clientY, ignore, subject) : null;
      selection.showInsert(pending?.line ?? null);
    };

    const onDrop = (event: DragEvent) => {
      const drag = session.getSnapshot().drag;
      if (!drag) return;
      event.preventDefault();
      const subject = dragSubject(session.getSnapshot(), drag);
      const drop =
        pending ??
        (subject
          ? measure(
              event.clientX,
              event.clientY,
              drag.kind === 'node' ? drag.nodeId : null,
              subject,
            )
          : null);
      pending = null;
      selection.showInsert(null);
      session.endDrag();
      if (!drop) {
        if (subject && selection.frameAt(event.clientX, event.clientY)) {
          session.setNotice(
            refusalMessage(session.getSnapshot().document.kind, subject.type, subject.instanceKind),
          );
        }
        return;
      }
      if (drag.kind === 'node') {
        const doc = session.getSnapshot().document;
        if (!sameSlot(doc, drag.nodeId, drop.parentId, drop.index)) {
          session.execute({
            type: 'move',
            nodeId: drag.nodeId,
            parentId: drop.parentId,
            index: drop.index,
          });
        }
        session.selectNode(drag.nodeId);
        return;
      }
      const asset = session.getSnapshot().catalog.find((item) => item.id === drag.assetId);
      const id = createId();
      session.execute({
        type: 'insert',
        parentId: drop.parentId,
        index: drop.index,
        node: {
          id,
          type: 'instance',
          component: drag.assetId,
          ...(asset ? { name: asset.name } : {}),
        },
      });
      if (session.getSnapshot().document.nodes[id]) session.selectNode(id);
    };

    const onDragLeave = (event: DragEvent) => {
      if (event.target !== viewport) return;
      selection.showInsert(null);
      pending = null;
    };

    const onWindowDragEnd = () => {
      selection.showInsert(null);
      pending = null;
    };

    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const target = event.target;
      if (isElement(target) && (target.tagName === 'BUTTON' || target.tagName === 'A')) return;
      if (
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'ArrowDown'
      ) {
        return;
      }
      const snap = session.getSnapshot();
      const node = snap.selectedNode;
      if (!node?.layout || node.layout.position !== 'absolute') return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      const seeded =
        node.layout.x === undefined || node.layout.y === undefined ? readOffset(node.id) : null;
      const layout = writeLayoutFields(node.layout, null, {
        x: (node.layout.x ?? seeded?.x ?? 0) + dx,
        y: (node.layout.y ?? seeded?.y ?? 0) + dy,
      });
      if (!layout) return;
      session.execute({ type: 'setProp', nodeId: node.id, prop: 'layout', value: layout });
    };

    const markTouched = () => {
      untouchedRef.current = false;
    };
    const onStagePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('input, button, textarea, select')
      ) {
        event.preventDefault();
      }
    };

    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointerup', endGesture);
    viewport.addEventListener('pointercancel', endGesture);
    viewport.addEventListener('pointerdown', markTouched);
    viewport.addEventListener('wheel', markTouched, { passive: true });
    viewport.addEventListener('dragover', onDragOver);
    viewport.addEventListener('drop', onDrop);
    viewport.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragend', onWindowDragEnd);
    window.addEventListener('keydown', onKey);
    stageEl.addEventListener('pointerdown', onStagePointerDown);
    session.setFitHandler(() => fitRef.current());
    session.setZoomByHandler((factor) => {
      markTouched();
      stage.zoomBy(factor);
      selection.reposition();
    });

    return () => {
      stopZoom();
      stopClick();
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointerup', endGesture);
      viewport.removeEventListener('pointercancel', endGesture);
      viewport.removeEventListener('pointerdown', markTouched);
      viewport.removeEventListener('wheel', markTouched);
      viewport.removeEventListener('dragover', onDragOver);
      viewport.removeEventListener('drop', onDrop);
      viewport.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragend', onWindowDragEnd);
      window.removeEventListener('keydown', onKey);
      stageEl.removeEventListener('pointerdown', onStagePointerDown);
      session.setFitHandler(null);
      session.setZoomByHandler(null);
      selection.destroy();
      stage.destroy();
      selectionRef.current = null;
      stageControllerRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    const stageEl = stageRef.current;
    const stage = stageControllerRef.current;
    if (!stageEl || !stage) return;
    const documents = session.boardDocuments();
    const page = documents.find((document) => document.id === openId);
    if (!page) return;
    let board: ViewportBoard;
    try {
      board = createViewportBoard({
        parent: stageEl,
        documents,
        page,
        stores: session.boardStores(),
        design: session.designInput(),
        paintRoot: page.kind !== 'page',
        onLayout: () => selectionRef.current?.reposition(),
        getChrome: (id) => session.getSnapshot().viewportChrome[id],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open the stage';
      session.setNotice(message, 'error');
      return;
    }
    boardRef.current = board;
    stageEl.classList.remove('is-ready');
    const fit = () => {
      untouchedRef.current = true;
      board.syncHeights();
      stage.fit(board.element);
      stageEl.classList.add('is-ready');
    };
    fitRef.current = fit;
    untouchedRef.current = true;
    fit();
    // Layout and fonts settle after the first measure. Refit while the user has not panned.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (boardRef.current !== board || !untouchedRef.current) return;
        fit();
      });
    });
    void board.whenFontsReady().then(() => {
      if (boardRef.current !== board) return;
      if (untouchedRef.current) fit();
      else selectionRef.current?.reposition();
    });
    return () => {
      if (boardRef.current === board) boardRef.current = null;
      board.destroy();
    };
  }, [session, openId, generation]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.setDesign(session.designInput());
  }, [session, designRevision]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.applyChrome((id) => session.getSnapshot().viewportChrome[id]);
  }, [session, chromeRevision, openId]);

  useEffect(() => {
    selectionRef.current?.show(selectedRenderId, focusViewportId);
    const frames = boardRef.current?.frames() ?? [];
    for (const frame of frames) {
      const column = frame.column;
      column.classList.toggle('is-focus', frame.breakpoint.id === focusViewportId);
      column.classList.toggle('is-viewport-selected', frame.breakpoint.id === selectedViewportId);
    }
  }, [selectedRenderId, focusViewportId, selectedViewportId, openId, generation]);

  useEffect(() => {
    viewportRef.current?.classList.toggle('is-inserting', tool !== 'select');
  }, [tool]);

  return (
    <div className="viewport" ref={viewportRef}>
      <div className="stage" ref={stageRef} />
      <p
        className={isInsertTool(tool) ? 'hint insert-mode-cue' : 'hint'}
        role={isInsertTool(tool) ? 'status' : undefined}
        data-testid={isInsertTool(tool) ? 'insert-mode-cue' : 'stage-hint'}
      >
        {isInsertTool(tool)
          ? insertModeCue(tool)
          : 'Scroll to zoom · drag the canvas to pan · F T I insert · double-click drills in and opens the master in the project tree'}
      </p>
    </div>
  );
}

interface Drop {
  parentId: string;
  index: number;
  line: OverlayBox;
}

interface Gesture {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  mode: 'insert' | 'reorder';
  nodeId: string | null;
}

interface PlaceSubject {
  type: NodeType;
  instanceKind?: string;
}

function gestureSubject(snap: EditorSnapshot, gesture: Gesture): PlaceSubject | null {
  if (gesture.mode === 'insert') {
    if (snap.tool === 'select') return null;
    return { type: snap.tool };
  }
  if (!gesture.nodeId) return null;
  return nodeSubject(snap, gesture.nodeId);
}

function dragSubject(snap: EditorSnapshot, drag: EditorDrag): PlaceSubject | null {
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
