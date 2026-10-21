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
import { DynamicElement, type PreviewControlValue } from '../../domain/viewport/dynamic-element';
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
  const [runtimeStates, setRuntimeStates] = useState<
    Record<string, Readonly<Record<string, FieldValue | null>>>
  >({});
  const runtimeStatesRef = useRef(runtimeStates);
  const [controlValues, setControlValues] = useState<Record<string, PreviewControlValue>>({});

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
  const previewCatalog = useMemo(() => {
    if (!definition) return coreSnapshot.catalog;
    const collection =
      definition.kind === 'atom' ? 'atoms' : definition.kind === 'page' ? 'pages' : 'components';
    return {
      ...coreSnapshot.catalog,
      [collection]: { ...coreSnapshot.catalog[collection], [definition.uuid]: definition },
    };
  }, [coreSnapshot.catalog, definition]);
  const behaviorDefinitions = useMemo(() => {
    const definitions = [
      ...Object.values(previewCatalog.atoms),
      ...Object.values(previewCatalog.components),
      ...Object.values(previewCatalog.pages),
    ];
    return new Map(definitions.map((item) => [item.uuid, item]));
  }, [previewCatalog]);
  const behaviorStateSignature = JSON.stringify(
    [...behaviorDefinitions.values()].map((item) => [item.uuid, item.behavior]),
  );
  const handleControlChange = useCallback((key: string, value: PreviewControlValue) => {
    setControlValues((current) => ({ ...current, [key]: value }));
  }, []);
  const toggleInteraction = useCallback(() => {
    runtimeStatesRef.current = {};
    setRuntimeStates({});
    setControlValues({});
    setInteracting((current) => !current);
  }, [behaviorStateSignature]);
  useEffect(() => {
    runtimeStatesRef.current = {};
    setRuntimeStates({});
    setControlValues({});
    setInteracting(false);
  }, [openId, behaviorStateSignature]);
  useEffect(() => {
    boardRef.current?.setInteractionEnabled(interacting);
  }, [frames, interacting]);
  const buildConfig = useMemo(() => {
    if (!frames.length || !definition) return null;
    return resolveDefinitionToElementBuildConfig(
      definition,
      previewCatalog,
      {},
      {
        ...(interacting ? { behaviorStateByInstance: runtimeStates } : {}),
        includeBehaviorTargets: interacting,
      },
    );
  }, [frames, definition, previewCatalog, openId, designRevision, interacting, runtimeStates]);
  const behaviorHandler = useCallback(
    (
      target: {
        scopeKey: string;
        definitionUuid: string;
        nodeUuid: string;
        props?: Readonly<Record<string, FieldValue>>;
        repeaterIndices?: Readonly<Record<string, number>>;
      },
      eventName: string,
      event: unknown,
    ) => {
      if (!interacting) return;
      const owner = behaviorDefinitions.get(target.definitionUuid);
      const behavior = owner?.behavior as ComponentBehavior | undefined;
      if (!behavior) return;
      const result = executeComponentBehavior(behavior, target.nodeUuid, eventName, {
        state: runtimeStatesRef.current[target.scopeKey] ?? behavior.state ?? {},
        props: target.props ?? owner?.config?.previewData?.fields,
        event: behaviorEventSnapshot(event),
        repeaterIndices: target.repeaterIndices,
      });
      if (!result.matched) return;
      const nextStates = { ...runtimeStatesRef.current, [target.scopeKey]: { ...result.state } };
      runtimeStatesRef.current = nextStates;
      setRuntimeStates(nextStates);
      for (const emission of result.emitted) {
        const eventTarget = (event as { target?: { ownerDocument?: Document } } | null)?.target;
        const document =
          eventTarget?.ownerDocument ?? boardRef.current?.frames()[0]?.host.contentDocument();
        document?.dispatchEvent(
          new CustomEvent(`facadeur:${emission.name}`, { detail: emission.args }),
        );
      }
    },
    [interacting, behaviorDefinitions],
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
              interactive={interacting}
              controlValues={controlValues}
              onControlChange={handleControlChange}
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
            : interacting
              ? 'Test mode · use the component controls and events · click the button to return to layer editing'
              : 'Scroll to zoom · drag the canvas to pan · Click to select a layer · F T I insert'}
      </p>
      {definition && !isInsertTool(tool) && !readOnly && (
        <button
          className="stage-interaction-toggle"
          type="button"
          aria-pressed={interacting}
          onClick={toggleInteraction}
        >
          {interacting ? 'Preview interaction on · click to edit layers' : 'Try this component'}
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
    ...draggedRepeaterIndices(record),
  };
}

function draggedRepeaterIndices(event: Record<string, unknown>) {
  const dataTransfer = event.dataTransfer as { getData?: (type: string) => string } | undefined;
  if (!dataTransfer || typeof dataTransfer.getData !== 'function') return {};
  try {
    const value = JSON.parse(dataTransfer.getData('application/x-facadeur-repeater')) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const indices = Object.fromEntries(
      Object.entries(value).filter(
        ([, index]) => typeof index === 'number' && Number.isInteger(index),
      ),
    );
    return { draggedRepeaterIndices: indices };
  } catch {
    return {};
  }
}
