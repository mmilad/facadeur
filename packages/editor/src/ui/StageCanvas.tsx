import { useEffect, useRef } from 'react';
import { createSelection, type SelectionController } from '../selection.js';
import type { EditorSession } from '../session.js';
import { createStage, type StageController } from '../stage.js';
import { createViewportBoard, type ViewportBoard } from '../viewports.js';

export function StageCanvas({
  session,
  openId,
  generation,
  designRevision,
  selectedRenderId,
}: {
  session: EditorSession;
  openId: string;
  generation: number;
  designRevision: number;
  selectedRenderId: string | null;
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

    const stage = createStage(viewport, stageEl);
    stageControllerRef.current = stage;
    const selection = createSelection({
      stage: stageEl,
      getScale: () => stage.getScale(),
      frames: () => boardRef.current?.frames() ?? [],
      onSelect: (renderedId) => session.selectRendered(renderedId),
    });
    selectionRef.current = selection;

    const stopZoom = stage.onChange(({ scale }) => {
      session.setZoom(scale);
      selection.reposition();
    });
    const stopClick = stage.onClick((event) => {
      const hit = selection.hitAt(event.clientX, event.clientY);
      if (hit) session.selectRendered(hit.id);
      else session.selectRendered(null);
    });

    const onPointerMove = (event: PointerEvent) => {
      if (stage.isPanning()) {
        selection.clearHover();
        return;
      }
      selection.hoverAt(event.clientX, event.clientY);
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
    viewport.addEventListener('pointerdown', markTouched);
    viewport.addEventListener('wheel', markTouched, { passive: true });
    stageEl.addEventListener('pointerdown', onStagePointerDown);
    session.setFitHandler(() => fitRef.current());

    return () => {
      stopZoom();
      stopClick();
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerdown', markTouched);
      viewport.removeEventListener('wheel', markTouched);
      stageEl.removeEventListener('pointerdown', onStagePointerDown);
      session.setFitHandler(null);
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
    selectionRef.current?.show(selectedRenderId);
  }, [selectedRenderId, openId, generation]);

  return (
    <div className="viewport" ref={viewportRef}>
      <div className="stage" ref={stageRef} />
      <p className="hint">Scroll to zoom · drag to pan · click to select</p>
    </div>
  );
}
