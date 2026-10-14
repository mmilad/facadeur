import {
  CoreController,
  DocumentError,
  emptyProjectCatalog,
  findNodeByUuid,
  type CatalogDesignCommand,
  type DefaultKind,
} from '@facadeur/core';
import { catalogAssetSummaries } from '../catalog/asset-list';
import { buildCatalogEditorSnapshot, initialCatalogAsset } from './catalog-snapshot';
import type {
  EditorDrag,
  EditorNotice,
  EditorSession,
  EditorSessionOptions,
  EditorSnapshot,
  EditorTool,
} from './types';
import type { StyleEditMode } from '../viewport/viewport-edit';
import type { StageState } from '../viewport/stage';

export function createEditorSession(options: EditorSessionOptions): EditorSession {
  const core = options.core ?? new CoreController(options.projectCatalog ?? emptyProjectCatalog());

  const listeners = new Set<() => void>();
  let workspace: DefaultKind = 'page';
  let openId = '';
  let selectedNodeId: string | null = null;
  let selectedRenderId: string | null = null;
  let notice: EditorNotice | null = null;
  let zoomLabel = '100%';
  const canvasTransforms = new Map<string, StageState>();
  let tool: EditorTool = 'select';
  let drag: EditorDrag | null = null;
  let generation = 0;
  let designRevision = 0;
  let selectingNode = false;
  let revision = 0;
  let catalogBaseline = JSON.stringify(core.getSnapshot().catalog);
  function defaultFocusViewportId() {
    const breakpoints = core.getActiveBreakpoints();
    return breakpoints[0]?.uuid ?? null;
  }
  let focusViewportId: string | null = defaultFocusViewportId();
  let selectedViewportId: string | null = null;
  let editTarget: StyleEditMode = 'base';
  let fitHandler: (() => void) | null = null;
  let zoomByHandler: ((factor: number) => void) | null = null;

  let snapshot: EditorSnapshot | null = null;

  function catalogDirty() {
    return JSON.stringify(core.getSnapshot().catalog) !== catalogBaseline;
  }

  function build() {
    return buildCatalogEditorSnapshot({
      core,
      workspace,
      openId,
      selectedNodeId,
      selectedRenderId,
      tool,
      drag,
      notice,
      zoomLabel,
      generation,
      designRevision,
      revision,
      catalogDirty: catalogDirty(),
      focusViewportId,
      selectedViewportId,
      editTarget,
    });
  }

  function publish() {
    revision += 1;
    snapshot = build();
    for (const listener of listeners) listener();
  }

  function openAssetCore(id: string) {
    const located = core.getDefinition(id);
    if (!located) {
      core.closeDefinition();
      notice = { tone: 'error', text: `Unknown catalog definition "${id}"` };
      publish();
      return;
    }
    try {
      core.openDefinition(id);
    } catch (failure) {
      notice = {
        tone: 'error',
        text: failure instanceof Error ? failure.message : `Unknown catalog definition "${id}"`,
      };
      publish();
      return;
    }
    const definition = located.definition;
    const coreSnap = core.getSnapshot();
    openId = id;
    workspace =
      definition.kind === 'page' ? 'page' : definition.kind === 'component' ? 'component' : 'atom';
    tool = 'select';
    drag = null;
    selectedNodeId = coreSnap.selectedNodeUuid;
    selectedRenderId = coreSnap.selectedNodeUuid ? `node:${coreSnap.selectedNodeUuid}` : null;
    notice = null;
    generation += 1;
    publish();
  }

  function applySelectNode(nodeId: string) {
    const definition = core.getSnapshot().openDefinition;
    if (definition && findNodeByUuid(definition.root, nodeId)) {
      selectingNode = true;
      try {
        core.selectNode(nodeId);
      } finally {
        selectingNode = false;
      }
      selectedNodeId = nodeId;
      selectedRenderId = `node:${nodeId}`;
      publish();
      return;
    }
  }

  const initial = initialCatalogAsset(catalogAssetSummaries(core));
  if (initial) {
    workspace = initial.kind;
    openAssetCore(initial.id);
  } else {
    snapshot = build();
  }

  const unsubCore = core.subscribe(() => {
    generation += 1;
    if (!selectingNode) designRevision += 1;
    if (openId && !core.getDefinition(openId)) {
      openId = '';
      selectedNodeId = null;
      selectedRenderId = null;
    }
    if (
      focusViewportId &&
      !core.getActiveBreakpoints().some((item) => item.uuid === focusViewportId)
    ) {
      focusViewportId = defaultFocusViewportId();
    }
    publish();
  });

  return {
    core,
    destroy() {
      unsubCore();
      listeners.clear();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      if (!snapshot) throw new DocumentError('schema', 'Editor session is not ready');
      return snapshot;
    },
    markCatalogSaved() {
      catalogBaseline = JSON.stringify(core.getSnapshot().catalog);
      publish();
    },
    setWorkspace(kind) {
      workspace = kind;
      publish();
    },
    openAsset(id) {
      openAssetCore(id);
    },
    selectNode(nodeId) {
      if (!nodeId) {
        selectedNodeId = null;
        selectedRenderId = null;
        publish();
        return;
      }
      applySelectNode(nodeId);
    },
    selectRendered(renderedId) {
      selectedRenderId = renderedId;
      publish();
    },
    setFocusViewport(id) {
      focusViewportId = id;
      publish();
    },
    selectViewport(id) {
      selectedViewportId = id;
      publish();
    },
    setEditTarget(target) {
      editTarget = target;
      publish();
    },
    setTool(next) {
      tool = next;
      publish();
    },
    beginDrag(next) {
      drag = next;
      publish();
    },
    endDrag() {
      drag = null;
      publish();
    },
    executeDesign(command: CatalogDesignCommand) {
      core.applyDesignCommand(command);
      designRevision += 1;
      notice = null;
      publish();
    },
    setNotice(text, tone = 'info') {
      notice = { tone, text };
      publish();
    },
    setZoom(scale) {
      const percent = scale * 100;
      zoomLabel = `${scale === 1 ? 100 : Math.round(percent)}%`;
      publish();
    },
    setZoomByHandler(handler) {
      zoomByHandler = handler;
    },
    zoomBy(factor) {
      zoomByHandler?.(factor);
    },
    resetZoom() {
      zoomByHandler?.(1);
    },
    setFitHandler(handler) {
      fitHandler = handler;
    },
    fit() {
      fitHandler?.();
    },
    getCanvasTransform(assetId) {
      return canvasTransforms.get(assetId) ?? null;
    },
    rememberCanvasTransform(assetId, state) {
      canvasTransforms.set(assetId, state);
    },
  };
}
