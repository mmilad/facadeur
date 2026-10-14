import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { insertModeCue, isInsertTool } from '../../domain/editing';
import type { SelectionController } from '../../domain/selection/selection';
import type { AppService } from '../../app-service';
import type { EditorEvent } from '../../domain/sidebar/events';
import type { EditorSession, EditorTool } from '../../domain/session';
import type { StageController } from '../../domain/viewport/stage';
import type { ViewportBoard } from '../../domain/viewport/board';
import { useStagePointer } from './canvas/useStagePointer';
import { useStageViewportBoard } from './canvas/useStageViewportBoard';
import { DynamicElement } from '../../domain/viewport/dynamic-element';
import { renderElementBuildStyleCss, renderGlobalStyleCss } from '@facadeur/style-engine';

export function StageCanvas({
  app,
  session,
  onEvent,
  openId,
  designRevision,
  selectedRenderId,
  focusViewportId,
  selectedViewportId,
  tool,
  readOnly = false,
}: {
  app: AppService;
  session: EditorSession;
  onEvent: (event: EditorEvent) => void;
  openId: string;
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
  const fitRef = useRef<() => void>(() => {});

  useStagePointer({
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
  });

  const frames = useStageViewportBoard({
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
  });
  const buildConfig = useMemo(
    () => (frames.length ? app.buildOpenDefinition() : null),
    [app, frames, openId, designRevision],
  );
  const globalStyleCss = useMemo(() => {
    const catalog = app.getCatalog();
    return [
      buildConfig ? renderElementBuildStyleCss(buildConfig, catalog) : '',
      renderGlobalStyleCss(catalog),
    ]
      .filter(Boolean)
      .join('\n\n');
  }, [app, buildConfig, designRevision]);
  useEffect(() => {
    for (const frame of boardRef.current?.frames() ?? []) {
      if (!frame.host.element.isConnected) continue;
      const document = frame.host.contentDocument();
      let style = document.head.querySelector<HTMLStyleElement>(
        'style[data-facadeur-global-styles]',
      );
      if (!style) {
        style = document.createElement('style');
        style.dataset.facadeurGlobalStyles = 'true';
        document.head.append(style);
      }
      style.textContent = globalStyleCss;
    }
  }, [frames, globalStyleCss]);
  const mountedFrames = frames.filter((frame) => frame.host.element.isConnected);
  const framePortals =
    buildConfig && mountedFrames.length
      ? mountedFrames.map((frame) =>
          createPortal(
            <DynamicElement config={buildConfig} />,
            frame.host.contentDocument().body,
            frame.breakpoint.uuid,
          ),
        )
      : null;

  useEffect(() => {
    viewportRef.current?.classList.toggle('is-inserting', tool !== 'select');
  }, [tool]);

  return (
    <div className="viewport" ref={viewportRef}>
      <div className="stage" ref={stageRef}>
        {framePortals}
      </div>
      <p
        className={isInsertTool(tool) ? 'hint insert-mode-cue' : 'hint'}
        role={isInsertTool(tool) ? 'status' : undefined}
        data-testid={isInsertTool(tool) ? 'insert-mode-cue' : 'stage-hint'}
      >
        {isInsertTool(tool)
          ? insertModeCue(tool)
          : readOnly
            ? 'Scroll to zoom · drag the canvas to pan'
            : 'Scroll to zoom · drag the canvas to pan · Click to select a layer · F T I insert'}
      </p>
    </div>
  );
}
