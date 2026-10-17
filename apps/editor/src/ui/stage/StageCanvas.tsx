import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { executeComponentBehavior, resolveDefinitionToElementBuildConfig } from '@facadeur/core';
import {
  renderDesignCss,
  renderDynamicStyleCss,
  renderGlobalStyleCss,
} from '@facadeur/style-engine';
import type { ComponentBehavior, FieldValue } from '@facadeur/domain';

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
  const [interacting, setInteracting] = useState(false);
  const [runtimeState, setRuntimeState] = useState<Record<string, FieldValue | null>>({});
  const runtimeStateRef = useRef(runtimeState);

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
  const coreSnapshot = app.getCoreSnapshot();
  const definition = coreSnapshot.openDefinition;
  const behavior = definition?.behavior as ComponentBehavior | undefined;
  const hasTransitions = (behavior?.transitions.length ?? 0) > 0;
  useEffect(() => {
    const initialState = { ...(behavior?.state ?? {}) };
    runtimeStateRef.current = initialState;
    setRuntimeState(initialState);
    setInteracting(false);
  }, [openId, behavior?.state]);
  useEffect(() => {
    boardRef.current?.setInteractionEnabled(interacting);
  }, [frames, interacting]);
  const buildConfig = useMemo(() => {
    if (!frames.length || !definition) return null;
    const previewDefinition =
      interacting && behavior
        ? { ...definition, behavior: { ...behavior, state: runtimeState } }
        : definition;
    return resolveDefinitionToElementBuildConfig(previewDefinition, coreSnapshot.catalog);
  }, [
    frames,
    definition,
    coreSnapshot.catalog,
    openId,
    designRevision,
    interacting,
    behavior,
    runtimeState,
  ]);
  const behaviorHandler = useCallback(
    (nodeUuid: string, eventName: string, event: unknown) => {
      if (!interacting || !behavior) return;
      const result = executeComponentBehavior(behavior, nodeUuid, eventName, {
        state: runtimeStateRef.current,
        props: definition?.config?.previewData?.fields,
        event: behaviorEventSnapshot(event),
      });
      if (!result.matched) return;
      runtimeStateRef.current = { ...result.state };
      setRuntimeState({ ...result.state });
      for (const emission of result.emitted) {
        const document = boardRef.current?.frames()[0]?.host.contentDocument();
        document?.dispatchEvent(
          new CustomEvent(`facadeur:${emission.name}`, { detail: emission.args }),
        );
      }
    },
    [interacting, behavior, definition],
  );
  const globalStyleCss = useMemo(() => {
    const catalog = app.getCatalog();
    return [
      buildConfig
        ? renderDesignCss({
            tokens: catalog.tokens,
            breakpoints: catalog.globalStyles?.breakpoints,
          })
        : '',
      buildConfig ? renderDynamicStyleCss(buildConfig, catalog) : '',
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
            <DynamicElement
              config={buildConfig}
              behaviorHandler={interacting ? behaviorHandler : undefined}
            />,
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
      {hasTransitions && !isInsertTool(tool) && !readOnly && (
        <button
          className="stage-interaction-toggle"
          type="button"
          aria-pressed={interacting}
          onClick={() => setInteracting((value) => !value)}
        >
          {interacting
            ? 'Preview interaction on · click to edit layers'
            : 'Try component interactions'}
        </button>
      )}
    </div>
  );
}

function behaviorEventSnapshot(event: unknown) {
  if (!event || typeof event !== 'object') return {};
  const record = event as Record<string, unknown>;
  const target =
    record.target && typeof record.target === 'object'
      ? (record.target as Record<string, unknown>)
      : undefined;
  return {
    ...(target
      ? { target: { value: target.value, checked: target.checked, name: target.name } }
      : {}),
    ...(typeof record.key === 'string' ? { key: record.key } : {}),
    ...(typeof record.button === 'number' ? { button: record.button } : {}),
    ...(typeof record.altKey === 'boolean' ? { altKey: record.altKey } : {}),
    ...(typeof record.ctrlKey === 'boolean' ? { ctrlKey: record.ctrlKey } : {}),
    ...(typeof record.metaKey === 'boolean' ? { metaKey: record.metaKey } : {}),
    ...(typeof record.shiftKey === 'boolean' ? { shiftKey: record.shiftKey } : {}),
  };
}
