import { findNodeByUuid, findParentOfNode } from '@facadeur/core';
import { useEffect, type RefObject } from 'react';
import type { AppService } from '../../../app-service/AppService';
import type { EditorEvent } from '../../../domain/sidebar/events';
import { EditorEventType } from '../../../domain/sidebar/events';
import type { SelectionController } from '../../../domain/selection/selection';
import { createSelection } from '../../../domain/selection/selection';
import { nodeUuidFromHit, createStagePlacement } from './stage-pointer-placement';
import type { EditorSession, EditorTool } from '../../../domain/session';
import { createStage, type StageController } from '../../../domain/viewport/stage';
import type { ViewportBoard } from '../../../domain/viewport/board';
import type { ViewportFrame } from '../../../domain/viewport/board';
import { catalogNodeUuidForRenderedHit } from '../../../domain/catalog/rendered-hit';
import { isEditableTarget } from '../../../domain/keyboard';

export function useStagePointer({
  app,
  session,
  onEvent,
  viewportRef,
  stageRef,
  boardRef,
  selectionRef,
  stageControllerRef,
  untouchedRef,
  fitRef,
}: {
  app: AppService;
  session: EditorSession;
  onEvent: (event: EditorEvent) => void;
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
    const selection = createSelectionForStage(stageEl, stage, boardRef);
    selectionRef.current = selection;

    let pending: ReturnType<ReturnType<typeof createStagePlacement>['measure']> = null;
    let gesture: {
      pointerId: number;
      startX: number;
      startY: number;
      moved: boolean;
      nodeUuid: string | null;
      tool: Exclude<EditorTool, 'select'> | null;
    } | null = null;
    let lastClick = { time: 0, x: 0, y: 0 };
    const placement = createStagePlacement({
      app,
      session,
      onEvent,
      getBoard: () => boardRef.current,
      selection,
      stage,
      stageElement: stageEl,
    });
    const stopZoom = stage.onChange(({ scale }) => {
      session.setZoom(scale);
      selection.reposition();
    });
    const stopClick = stage.onClick((event) => {
      if (session.getSnapshot().tool === 'select') choose(event);
    });

    function authoredHit(frame: ViewportFrame | null, id: string | undefined) {
      const definition = app.getCoreSnapshot().openDefinition;
      return catalogNodeUuidForRenderedHit(
        frame,
        id ? nodeUuidFromHit(id) : null,
        definition?.root,
      );
    }

    function chainTo(uuid: string | null) {
      const definition = app.getCoreSnapshot().openDefinition;
      if (!definition || !uuid) return [] as string[];
      const chain = [uuid];
      let current = uuid;
      while (current !== definition.root.uuid) {
        const parent = findParentOfNode(definition.root, current)?.parent;
        if (!parent) return [];
        current = parent.uuid;
        chain.push(current);
      }
      return chain.reverse();
    }

    function choose(
      event: { clientX: number; clientY: number; ctrlKey?: boolean; metaKey?: boolean },
      deeper = false,
    ) {
      const frame = selection.frameAt(event.clientX, event.clientY);
      const hit = selection.hitAt(event.clientX, event.clientY);
      const uuid = authoredHit(frame, hit?.id);
      if (!uuid) {
        onEvent({
          type: EditorEventType.NodeSelect,
          data: { nodeId: app.getCoreSnapshot().openDefinition?.root.uuid ?? null },
        });
        return;
      }
      const chain = chainTo(uuid);
      const snap = app.getCoreSnapshot();
      const current = snap.selectedNodeUuid;
      const mode = event.ctrlKey || event.metaKey ? 'deepest' : deeper ? 'deeper' : 'context';
      let target = uuid;
      if (mode === 'context') {
        const context = current && chain.includes(current) ? current : chain[0];
        const index = context ? chain.indexOf(context) : -1;
        if (index >= 0 && index < chain.length - 1) target = chain[index + 1]!;
      } else if (mode === 'deeper') {
        const anchor = current && chain.includes(current) ? current : chain[0];
        const index = anchor ? chain.indexOf(anchor) : -1;
        if (index >= 0 && index < chain.length - 1) target = chain[index + 1]!;
        else target = anchor ?? uuid;
      }
      onEvent({ type: EditorEventType.NodeSelect, data: { nodeId: target } });
    }

    function claimsPan(event: PointerEvent): boolean {
      if (event.button !== 0) return true;
      if (session.getSnapshot().tool !== 'select') return false;
      const frame = selection.frameAt(event.clientX, event.clientY);
      const hit = selection.hitAt(event.clientX, event.clientY);
      const uuid = authoredHit(frame, hit?.id);
      return !uuid || uuid === app.getCoreSnapshot().openDefinition?.root.uuid;
    }
    stage.setClaimsPan(claimsPan);

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
        pending = placement.measure(event.clientX, event.clientY, gesture.nodeUuid);
        selection.showInsert(pending?.line ?? null);
        return;
      }
      if (session.getSnapshot().drag) return;
      const frame = selection.frameAt(event.clientX, event.clientY);
      const hit = selection.hitAt(event.clientX, event.clientY);
      const uuid = authoredHit(frame, hit?.id);
      selection.hoverRendered(uuid ? `node:${uuid}` : null, frame?.host.id ?? null);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const frame = selection.frameAt(event.clientX, event.clientY);
      if (frame && claimsPan(event)) {
        onEvent({
          type: EditorEventType.ViewportSelect,
          data: { breakpointId: frame.breakpoint.uuid },
        });
        return;
      }
      if (frame)
        onEvent({
          type: EditorEventType.ViewportFocus,
          data: { breakpointId: frame.breakpoint.uuid },
        });
      if (claimsPan(event)) return;
      const hit = selection.hitAt(event.clientX, event.clientY);
      const tool = session.getSnapshot().tool;
      gesture = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        nodeUuid: tool === 'select' ? authoredHit(frame, hit?.id) : null,
        tool: tool === 'select' ? null : tool,
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
      if (!current.moved) {
        if (current.tool) {
          placement.placeTool(current.tool, event.clientX, event.clientY);
          return;
        }
        const now = performance.now();
        const distance = Math.hypot(event.clientX - lastClick.x, event.clientY - lastClick.y);
        const deeper = now - lastClick.time < 400 && distance < 4;
        lastClick = { time: now, x: event.clientX, y: event.clientY };
        choose(event, deeper);
        return;
      }
      const drop = pending;
      pending = null;
      if (drop && current.nodeUuid) placement.applyReorderDrop(current.nodeUuid, drop);
    };

    const onDragOver = (event: DragEvent) => {
      const drag = session.getSnapshot().drag;
      if (!drag) return;
      event.preventDefault();
      if (event.dataTransfer)
        event.dataTransfer.dropEffect = drag.kind === 'node' ? 'move' : 'copy';
      pending = placement.measure(
        event.clientX,
        event.clientY,
        drag.kind === 'node' ? drag.nodeId : null,
      );
      selection.showInsert(pending?.line ?? null);
    };

    const onDrop = (event: DragEvent) => {
      const drag = session.getSnapshot().drag;
      if (!drag) return;
      event.preventDefault();
      const drop = pending;
      pending = null;
      selection.showInsert(null);
      onEvent({ type: EditorEventType.LayerDragEnd, data: {} });
      placement.applyDrop(drag, drop);
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key !== 'ArrowLeft' &&
          event.key !== 'ArrowRight' &&
          event.key !== 'ArrowUp' &&
          event.key !== 'ArrowDown') ||
        isEditableTarget(event.target) ||
        (event.target instanceof Element && event.target.closest('button, a'))
      )
        return;
      const definition = app.getCoreSnapshot().openDefinition;
      const nodeUuid = app.getCoreSnapshot().selectedNodeUuid;
      if (!definition || !nodeUuid) return;
      const node = findNodeByUuid(definition.root, nodeUuid);
      if (!node || node.style?.position !== 'absolute') return;
      event.preventDefault();
      const frame = boardRef.current?.frames()[0];
      const rendered =
        frame && boardRef.current?.renderedNodes(frame).find((item) => item.uuid === nodeUuid);
      const parentUuid = findParentOfNode(definition.root, nodeUuid)?.parent.uuid;
      const parent =
        parentUuid &&
        frame &&
        boardRef.current?.renderedNodes(frame).find((item) => item.uuid === parentUuid);
      const left =
        numericCssValue(node.style.left) ??
        (rendered && parent ? rendered.rect.left - parent.rect.left : 0);
      const top =
        numericCssValue(node.style.top) ??
        (rendered && parent ? rendered.rect.top - parent.rect.top : 0);
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      onEvent({
        type: EditorEventType.NodeStyleRecordSet,
        data: {
          nodeId: nodeUuid,
          style: {
            ...node.style,
            left: `${left + dx}px`,
            top: `${top + dy}px`,
          },
        },
      });
      onEvent({ type: EditorEventType.CatalogPersist, data: {} });
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
    window.addEventListener('keydown', onKeyDown);
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
      window.removeEventListener('keydown', onKeyDown);
      stageEl.removeEventListener('pointerdown', onStagePointerDown);
      session.setFitHandler(null);
      session.setZoomByHandler(null);
      selection.destroy();
      stage.destroy();
      selectionRef.current = null;
      stageControllerRef.current = null;
    };
  }, [
    app,
    session,
    onEvent,
    viewportRef,
    stageRef,
    boardRef,
    selectionRef,
    stageControllerRef,
    untouchedRef,
    fitRef,
  ]);
}

function numericCssValue(value: string | undefined) {
  if (!value) return null;
  const match = /^(-?(?:\d+\.?\d*|\.\d+))(?:px)?$/.exec(value.trim());
  return match ? Number(match[1]) : null;
}

function createSelectionForStage(
  stageElement: HTMLDivElement,
  stage: StageController,
  boardRef: RefObject<ViewportBoard | null>,
) {
  return createSelection({
    stage: stageElement,
    getScale: () => stage.getScale(),
    frames: () => boardRef.current?.frames() ?? [],
  });
}
