import { useEffect, type RefObject } from 'react';
import type { SelectionController } from '../../../domain/selection/selection';
import type { AppService } from '../../../app-service';
import type { EditorSession } from '../../../domain/session';
import type { StageController } from '../../../domain/viewport/stage';
import { createV2ViewportBoard } from '../../../domain/viewport/v2-board';
import type { ViewportBoard } from '../../../domain/viewport/viewports';

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
  chromeRevision: number;
  activeVariantName: string | null;
  stageRef: RefObject<HTMLDivElement | null>;
  boardRef: RefObject<ViewportBoard | null>;
  selectionRef: RefObject<SelectionController | null>;
  stageControllerRef: RefObject<StageController | null>;
  untouchedRef: RefObject<boolean>;
  fitRef: RefObject<() => void>;
}) {
  useEffect(() => {
    const stageEl = stageRef.current;
    const stage = stageControllerRef.current;
    if (!stageEl || !stage) return;
    const coreSnap = app.getCoreSnapshot();
    if (!coreSnap.openDefinition) return;
    const buildConfig = app.core.node.element.buildOpenDefinition();
    if (!buildConfig) return;
    const board = createV2ViewportBoard({
      parent: stageEl,
      buildConfig,
      title: coreSnap.openDefinition.name,
      catalog: coreSnap.catalog,
    });
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
    return () => {
      board.destroy();
      boardRef.current = null;
    };
  }, [
    app,
    session,
    openId,
    generation,
    designRevision,
    stageRef,
    boardRef,
    stageControllerRef,
    untouchedRef,
    fitRef,
  ]);

  useEffect(() => {
    selectionRef.current?.show(selectedRenderId, focusViewportId);
    const frames = boardRef.current?.frames() ?? [];
    for (const frame of frames) {
      const column = frame.column;
      column.classList.toggle('is-focus', frame.breakpoint.id === focusViewportId);
      column.classList.toggle('is-viewport-selected', frame.breakpoint.id === selectedViewportId);
    }
  }, [
    selectedRenderId,
    focusViewportId,
    selectedViewportId,
    openId,
    generation,
    boardRef,
    selectionRef,
  ]);
}
