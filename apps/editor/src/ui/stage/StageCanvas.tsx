import { useEffect, useRef } from 'react';
import { insertModeCue, isInsertTool } from '../../domain/editing';
import type { SelectionController } from '../../domain/selection/selection';
import type { AppService } from '../../app-service';
import type { EditorSession, EditorTool } from '../../domain/session';
import type { StageController } from '../../domain/viewport/stage';
import type { ViewportBoard } from '../../domain/viewport/board';
import { useStagePointer } from './canvas/useStagePointer';
import { useStageViewportBoard } from './canvas/useStageViewportBoard';

export function StageCanvas({
  app,
  session,
  openId,
  generation,
  designRevision,
  selectedRenderId,
  focusViewportId,
  selectedViewportId,
  tool,
  readOnly = false,
}: {
  app: AppService;
  session: EditorSession;
  openId: string;
  generation: number;
  designRevision: number;
  selectedRenderId: string | null;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  tool: EditorTool;
  readOnly?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<ViewportBoard | null>(null);
  const selectionRef = useRef<SelectionController | null>(null);
  const stageControllerRef = useRef<StageController | null>(null);
  const untouchedRef = useRef(true);
  const fitRef = useRef<() => void>(() => {});

  useStagePointer({
    session,
    viewportRef,
    stageRef,
    boardRef,
    selectionRef,
    stageControllerRef,
    untouchedRef,
    fitRef,
  });

  useStageViewportBoard({
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
  });

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
          : readOnly
            ? 'Scroll to zoom · drag the canvas to pan'
            : 'Scroll to zoom · drag the canvas to pan · F T I insert · double-click selects the next nested layer'}
      </p>
    </div>
  );
}
