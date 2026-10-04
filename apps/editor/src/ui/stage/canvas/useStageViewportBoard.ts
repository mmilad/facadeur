import { useEffect, type RefObject } from 'react';
import type { SelectionController } from '../../../domain/selection/selection.js';
import type { EditorSession } from '../../../domain/session.js';
import type { StageController } from '../../../domain/viewport/stage.js';
import { createViewportBoard, type ViewportBoard } from '../../../domain/viewport/viewports.js';

export function useStageViewportBoard({
  session,
  openId,
  generation,
  designRevision,
  selectedRenderId,
  focusViewportId,
  selectedViewportId,
  chromeRevision,
  activeVariantName,
  stageRef,
  boardRef,
  selectionRef,
  stageControllerRef,
  untouchedRef,
  fitRef,
}: {
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
        schemaCatalog: session.getSnapshot().design.schemaCatalog,
        paintRoot: page.kind !== 'page',
        variantName: activeVariantName,
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
  }, [
    session,
    openId,
    generation,
    designRevision,
    activeVariantName,
    stageRef,
    boardRef,
    selectionRef,
    stageControllerRef,
    untouchedRef,
    fitRef,
  ]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.setDesign(session.designInput());
  }, [session, designRevision, boardRef]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    board.applyChrome((id) => session.getSnapshot().viewportChrome[id]);
  }, [session, chromeRevision, openId, boardRef]);

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
