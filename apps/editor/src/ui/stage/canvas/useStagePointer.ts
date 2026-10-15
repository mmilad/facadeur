import { findNodeByUuid, findParentOfNode } from '@facadeur/core';
import { useEffect, useRef, type RefObject } from 'react';
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
  openId,
  onEvent,
  viewportRef,
  stageRef,
  boardRef,
  selectionRef,
  stageControllerRef,
  fitRef,
}: {
  app: AppService;
  session: EditorSession;
  openId: string;
  onEvent: (event: EditorEvent) => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<ViewportBoard | null>;
  selectionRef: RefObject<SelectionController | null>;
  stageControllerRef: RefObject<StageController | null>;
  fitRef: RefObject<() => void>;
}) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

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
    const placement = createStagePlacement({
      app,
      session,
      onEvent: (event) => onEventRef.current(event),
      getBoard: () => boardRef.current,
      selection,
      stage,
      stageElement: stageEl,
    });
    const stopZoom = stage.onChange((state) => {
      if (boardRef.current) session.rememberCanvasTransform(openId, state);
      session.setZoom(state.scale);
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

    function choose(event: { clientX: number; clientY: number }) {
      const frame = selection.frameAt(event.clientX, event.clientY);
      const hit = selection.hitAt(event.clientX, event.clientY);
      const uuid = authoredHit(frame, hit?.id);
      onEventRef.current({
        type: EditorEventType.NodeSelect,
        data: { nodeId: uuid ?? app.getCoreSnapshot().openDefinition?.root.uuid ?? null },
      });
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
        onEventRef.current({
          type: EditorEventType.ViewportSelect,
          data: { breakpointId: frame.breakpoint.uuid },
        });
        return;
      }
      if (frame)
        onEventRef.current({
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
        choose(event);
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
      onEventRef.current({ type: EditorEventType.LayerDragEnd, data: {} });
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
      const catalog = app.getCoreSnapshot().catalog;
      const nodeUuid = app.getCoreSnapshot().selectedNodeUuid;
      if (!definition || !nodeUuid) return;
      const node = findNodeByUuid(definition.root, nodeUuid);
      const declarations = catalog.globalStyles?.block?.rules?.find(
        (rule) => rule.id === `layer-${nodeUuid}`,
      )?.declarations;
      if (!node || declarations?.position !== 'absolute') return;
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
        numericCssValue(declarations.left) ??
        (rendered && parent ? rendered.rect.left - parent.rect.left : 0);
      const top =
        numericCssValue(declarations.top) ??
        (rendered && parent ? rendered.rect.top - parent.rect.top : 0);
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      onEventRef.current({
        type: EditorEventType.DesignCommandExecute,
        data: {
          command: {
            type: 'setLayerStyleDeclarations',
            nodeUuid,
            breakpointUuid: null,
            declarations: {
              left: `${left + dx}px`,
              top: `${top + dy}px`,
            },
          },
        },
      });
      onEventRef.current({ type: EditorEventType.CatalogPersist, data: {} });
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
    viewport.addEventListener('dragover', onDragOver);
    viewport.addEventListener('drop', onDrop);
    viewport.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragend', onWindowDragEnd);
    window.addEventListener('keydown', onKeyDown);
    stageEl.addEventListener('pointerdown', onStagePointerDown);
    session.setFitHandler(() => fitRef.current());
    session.setZoomByHandler((factor) => {
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
    openId,
    viewportRef,
    stageRef,
    boardRef,
    selectionRef,
    stageControllerRef,
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
