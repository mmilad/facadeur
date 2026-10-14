import { useEffect, useRef, useState, type RefObject } from 'react';
import type { SelectionController } from '../../../domain/selection/selection';
import type { AppService } from '../../../app-service';
import type { EditorSession } from '../../../domain/session';
import type { StageController } from '../../../domain/viewport/stage';
import { createViewportBoard } from '../../../domain/viewport/board';
import type { ViewportBoard } from '../../../domain/viewport/board';

export function useStageViewportBoard({
  app,
  session,
  openId,
  designRevision,
  selectedRenderId,
  focusViewportId,
  selectedViewportId,
  stageRef,
  boardRef,
  selectionRef,
  stageControllerRef,
  fitRef,
}: {
  app: AppService;
  session: EditorSession;
  openId: string;
  designRevision: number;
  selectedRenderId: string | null;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  stageRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<ViewportBoard | null>;
  selectionRef: RefObject<SelectionController | null>;
  stageControllerRef: RefObject<StageController | null>;
  fitRef: RefObject<() => void>;
}) {
  const currentRevisionRef = useRef(designRevision);
  const [, setBoardRevision] = useState(0);
  const renderedRevisionRef = useRef<number | null>(null);
  currentRevisionRef.current = designRevision;
  const breakpointSignature = JSON.stringify(app.getDesignSnapshot().breakpoints);

  useEffect(() => {
    const stageEl = stageRef.current;
    const stage = stageControllerRef.current;
    if (!stageEl || !stage) return;
    const coreSnap = app.getCoreSnapshot();
    if (!coreSnap.openDefinition) return;
    const board = createViewportBoard({
      parent: stageEl,
      title: coreSnap.openDefinition.name,
      breakpoints: app.getActiveBreakpoints(),
    });
    boardRef.current = board;
    setBoardRevision((revision) => revision + 1);
    renderedRevisionRef.current = currentRevisionRef.current;
    stageEl.classList.remove('is-ready');
    const fit = () => {
      board.syncHeights();
      stage.fit(board.element);
      stageEl.classList.add('is-ready');
    };
    fitRef.current = fit;
    const savedTransform = session.getCanvasTransform(openId);
    if (savedTransform) {
      stage.setTransform(savedTransform.scale, savedTransform.tx, savedTransform.ty);
      board.syncHeights();
      stageEl.classList.add('is-ready');
    } else {
      fit();
    }
    return () => {
      board.destroy();
      boardRef.current = null;
      renderedRevisionRef.current = null;
    };
  }, [app, session, openId, breakpointSignature, stageRef, boardRef, stageControllerRef, fitRef]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || renderedRevisionRef.current === designRevision) return;
    const title = app.getCoreSnapshot().openDefinition?.name;
    if (title) board.setTitle(title);
    renderedRevisionRef.current = designRevision;
    const frame = window.requestAnimationFrame(() => {
      if (boardRef.current !== board) return;
      board.syncHeights();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [app, designRevision, boardRef]);

  useEffect(() => {
    selectionRef.current?.show(selectedRenderId, focusViewportId);
    const frames = boardRef.current?.frames() ?? [];
    for (const frame of frames) {
      const column = frame.column;
      column.classList.toggle('is-focus', frame.breakpoint.uuid === focusViewportId);
      column.classList.toggle('is-viewport-selected', frame.breakpoint.uuid === selectedViewportId);
    }
  }, [
    selectedRenderId,
    focusViewportId,
    selectedViewportId,
    openId,
    designRevision,
    breakpointSignature,
    boardRef,
    selectionRef,
  ]);

  return boardRef.current?.frames() ?? [];
}
