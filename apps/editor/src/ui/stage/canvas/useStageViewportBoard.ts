import { useEffect, useRef, type RefObject } from 'react';
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
  generation,
  designRevision,
  selectedRenderId,
  focusViewportId,
  selectedViewportId,
  stageRef,
  boardRef,
  selectionRef,
  stageControllerRef,
  untouchedRef,
  fitRef,
}: {
  app: AppService;
  session: EditorSession;
  openId: string;
  generation: number;
  designRevision: number;
  selectedRenderId: string | null;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  stageRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<ViewportBoard | null>;
  selectionRef: RefObject<SelectionController | null>;
  stageControllerRef: RefObject<StageController | null>;
  untouchedRef: RefObject<boolean>;
  fitRef: RefObject<() => void>;
}) {
  const currentRevisionRef = useRef(designRevision);
  const currentGenerationRef = useRef(generation);
  const renderedRevisionRef = useRef<number | null>(null);
  const renderedGenerationRef = useRef<number | null>(null);
  currentRevisionRef.current = designRevision;
  currentGenerationRef.current = generation;
  const breakpointSignature = JSON.stringify(
    app.getCoreSnapshot().catalog.globalStyles?.breakpoints ?? null,
  );

  useEffect(() => {
    const stageEl = stageRef.current;
    const stage = stageControllerRef.current;
    if (!stageEl || !stage) return;
    const coreSnap = app.getCoreSnapshot();
    if (!coreSnap.openDefinition) return;
    const buildConfig = app.core.node.element.buildOpenDefinition();
    if (!buildConfig) return;
    const board = createViewportBoard({
      parent: stageEl,
      buildConfig,
      title: coreSnap.openDefinition.name,
      catalog: coreSnap.catalog,
    });
    boardRef.current = board;
    renderedRevisionRef.current = currentRevisionRef.current;
    renderedGenerationRef.current = currentGenerationRef.current;
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
    return () => {
      board.destroy();
      boardRef.current = null;
      renderedRevisionRef.current = null;
      renderedGenerationRef.current = null;
    };
  }, [
    app,
    session,
    openId,
    breakpointSignature,
    stageRef,
    boardRef,
    stageControllerRef,
    untouchedRef,
    fitRef,
  ]);

  useEffect(() => {
    const board = boardRef.current;
    if (
      !board ||
      (renderedRevisionRef.current === designRevision &&
        renderedGenerationRef.current === generation)
    )
      return;
    const buildConfig = app.core.node.element.buildOpenDefinition();
    if (!buildConfig) return;
    const title = app.getCoreSnapshot().openDefinition?.name;
    board.updateBuildConfig(buildConfig, title);
    renderedRevisionRef.current = designRevision;
    renderedGenerationRef.current = generation;
    const frame = window.requestAnimationFrame(() => {
      if (boardRef.current !== board) return;
      board.syncHeights();
      if (untouchedRef.current) stageControllerRef.current?.fit(board.element);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [app, generation, designRevision, boardRef, stageControllerRef, untouchedRef]);

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
    generation,
    designRevision,
    breakpointSignature,
    boardRef,
    selectionRef,
  ]);
}
