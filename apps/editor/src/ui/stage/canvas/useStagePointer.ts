import { useEffect, type RefObject } from 'react';
import { writeLayoutFields } from '../../../domain/editing';
import { isEditableTarget } from '../../../domain/keyboard';
import {
  dataIdSelector,
  createSelection,
  type SelectionController,
} from '../../../domain/selection/selection';
import {
  documentChain,
  nodeIdForHit,
  renderIdForNode,
  resolveClick,
  type SelectMode,
} from '../../../domain/selection/selection-model';
import type { EditorSession, EditorSnapshot } from '../../../domain/session';
import { createStage, type StageController } from '../../../domain/viewport/stage';
import type { ViewportBoard } from '../../../domain/viewport/viewports';
import {
  createStagePlacement,
  dragSubject,
  gestureSubject,
  type StageDrop,
  type StageGesture,
} from './stage-pointer-placement';

export function useStagePointer({
  session,
  viewportRef,
  stageRef,
  boardRef,
  selectionRef,
  stageControllerRef,
  untouchedRef,
  fitRef,
}: {
  session: EditorSession;
  viewportRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<ViewportBoard | null>;
  selectionRef: RefObject<SelectionController | null>;
  stageControllerRef: RefObject<StageController | null>;
  untouchedRef: RefObject<boolean>;
  fitRef: RefObject<() => void>;
}) {
  useEffect(() => {
    const viewport = viewportRef.current;
    const stageEl = stageRef.current;
    if (!viewport || !stageEl) return;

    const stage = createStage(viewport, stageEl);
    stageControllerRef.current = stage;
    const selection = createSelection({
      stage: stageEl,
      getScale: () => stage.getScale(),
      frames: () => boardRef.current?.frames() ?? [],
    });
    selectionRef.current = selection;

    let pending: StageDrop | null = null;
    let gesture: StageGesture | null = null;
    let lastClick = { time: 0, x: 0, y: 0 };

    function isNestedRenderedId(snap: EditorSnapshot, renderedId: string): boolean {
      const local = nodeIdForHit(snap.document, renderedId, snap.paintRoot);
      if (!local) return false;
      return renderIdForNode(snap.document, local, snap.paintRoot) !== renderedId;
    }

    const placement = createStagePlacement({
      session,
      getBoard: () => boardRef.current,
      selection,
      stage,
      stageElement: stageEl,
      isNestedRenderedId,
    });

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
      if (hit) {
        if (hit.id.startsWith('v2:')) {
          session.selectNode(hit.id.slice(3));
          return;
        }
        const targetAddress = renderedAddressForClick(snap, hit.id, mode);
        if (targetAddress) {
          session.selectRendered(targetAddress);
          return;
        }
      }
      const chain = hit ? documentChain(snap.document, hit.id, snap.paintRoot) : [];
      const target = resolveClick({
        doc: snap.document,
        chain,
        selectedId: snap.selectedNodeId,
        mode,
      });
      session.selectNode(target);
    }

    function renderedAddressForClick(
      snap: EditorSnapshot,
      renderedId: string,
      mode: SelectMode,
    ): string | null {
      const chain = documentChain(snap.document, renderedId, snap.paintRoot);
      const localDeepest = chain[chain.length - 1] ?? null;
      const localAddress = localDeepest
        ? renderIdForNode(snap.document, localDeepest, snap.paintRoot)
        : null;
      if (mode === 'deepest') return renderedId;
      const selected = snap.selectedRenderId;
      if (!selected || selected === renderedId || !renderedId.startsWith(`${selected}/`)) {
        return localAddress;
      }
      if (mode === 'context') return selected;
      const remainder = renderedId.slice(selected.length + 1);
      const next = remainder.split('/')[0];
      return next ? `${selected}/${next}` : selected;
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
        pending = subject ? placement.measure(event.clientX, event.clientY, ignore, subject) : null;
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
      if (hit.id.startsWith('v2:')) {
        selection.hoverRendered(hit.id, frame.host.id);
        return;
      }
      const chain = documentChain(snap.document, hit.id, snap.paintRoot);
      const mode = event.ctrlKey || event.metaKey ? 'deepest' : 'context';
      const target = resolveClick({
        doc: snap.document,
        chain,
        selectedId: snap.selectedNodeId,
        mode,
      });
      const renderId = target ? renderIdForNode(snap.document, target, snap.paintRoot) : null;
      const address = renderedAddressForClick(snap, hit.id, mode);
      selection.hoverRendered(address ?? renderId, frame.host.id);
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
        nodeId:
          snap.tool === 'select' &&
          !snap.nestedSelection &&
          (!hit || !isNestedRenderedId(snap, hit.id))
            ? target
            : null,
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
          placement.placeTool(snap.tool, event.clientX, event.clientY, false);
          return;
        }
        const now = performance.now();
        const distance = Math.hypot(event.clientX - lastClick.x, event.clientY - lastClick.y);
        const deeper = now - lastClick.time < 400 && distance < 4;
        lastClick = { time: now, x: event.clientX, y: event.clientY };
        const mode: SelectMode =
          event.ctrlKey || event.metaKey ? 'deepest' : deeper ? 'deeper' : 'context';
        choose(event, mode);
        return;
      }
      const drop = pending;
      pending = null;
      if (!drop) return;
      if (current.mode === 'reorder' && current.nodeId) {
        placement.applyReorderDrop(current.nodeId, drop);
        return;
      }
      if (snap.tool === 'frame' || snap.tool === 'text' || snap.tool === 'image') {
        placement.placeTool(snap.tool, event.clientX, event.clientY, true);
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
      pending = subject ? placement.measure(event.clientX, event.clientY, ignore, subject) : null;
      selection.showInsert(pending?.line ?? null);
    };

    const onDrop = (event: DragEvent) => {
      const drag = session.getSnapshot().drag;
      if (!drag) return;
      event.preventDefault();
      const drop = pending;
      pending = null;
      selection.showInsert(null);
      session.endDrag();
      placement.applyDrop(drag, drop, event.clientX, event.clientY);
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
      if (snap.nestedSelection) return;
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
  }, [
    session,
    viewportRef,
    stageRef,
    boardRef,
    selectionRef,
    stageControllerRef,
    untouchedRef,
    fitRef,
  ]);
}

function isElement(value: unknown): value is HTMLElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nodeType' in value &&
    (value as Node).nodeType === Node.ELEMENT_NODE
  );
}
