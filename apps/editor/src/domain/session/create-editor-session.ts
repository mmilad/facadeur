import {
  CoreController,
  DocumentError,
  emptyProjectCatalog,
  findDefinition,
  findNodeByUuid,
  type CatalogDesignCommand,
  type DefaultKind,
} from '@facadeur/core';
import type { DesignInput } from '@facadeur/tokens';
import { catalogAssetSummaries } from '../catalog/asset-list';
import { activeBreakpoints } from '@facadeur/tokens';
import { createInMemoryCatalogPort } from '../project/in-memory-catalog-port';
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

export function createEditorSession(options: EditorSessionOptions): EditorSession {
  const core = options.core ?? new CoreController(options.projectCatalog ?? emptyProjectCatalog());
  const catalogPort =
    options.catalogPort ?? createInMemoryCatalogPort(() => core.getSnapshot().catalog);

  const listeners = new Set<() => void>();
  let workspace: DefaultKind = 'page';
  let openId = '';
  let selectedNodeId: string | null = null;
  let selectedRenderId: string | null = null;
  let notice: EditorNotice | null = null;
  let zoomLabel = '100%';
  let tool: EditorTool = 'select';
  let drag: EditorDrag | null = null;
  let generation = 0;
  let designRevision = 0;
  let revision = 0;
  let catalogBaseline = JSON.stringify(core.getSnapshot().catalog);
  function defaultFocusViewportId() {
    const breakpoints = activeBreakpoints(core.getSnapshot().catalog.globalStyles?.breakpoints);
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
    const located = findDefinition(core.getSnapshot().catalog, id);
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
      core.selectNode(nodeId);
      selectedNodeId = nodeId;
      selectedRenderId = `node:${nodeId}`;
      publish();
      return;
    }
  }

  const initial = initialCatalogAsset(catalogAssetSummaries(core.getSnapshot().catalog));
  if (initial) {
    workspace = initial.kind;
    openAssetCore(initial.id);
  } else {
    snapshot = build();
  }

  const unsubCore = core.subscribe(() => {
    generation += 1;
    designRevision += 1;
    if (openId && !findDefinition(core.getSnapshot().catalog, openId)) {
      openId = '';
      selectedNodeId = null;
      selectedRenderId = null;
    }
    if (
      focusViewportId &&
      !activeBreakpoints(core.getSnapshot().catalog.globalStyles?.breakpoints).some(
        (item) => item.uuid === focusViewportId,
      )
    ) {
      focusViewportId = defaultFocusViewportId();
    }
    publish();
  });

  const refuseDocumentCommand = () => {
    notice = {
      tone: 'info',
      text: 'Document commands are not available — edit catalog assets and design tokens only.',
    };
    publish();
  };

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
    setWorkspace(kind) {
      workspace = kind;
      publish();
    },
    openAsset(id) {
      openAssetCore(id);
    },
    drillToMaster: refuseDocumentCommand,
    navigateDrillParent: refuseDocumentCommand,
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
    setNestedField: refuseDocumentCommand,
    setFocusViewport(id) {
      focusViewportId = id;
      publish();
    },
    selectViewport(id) {
      selectedViewportId = id;
      publish();
    },
    setViewportChrome: refuseDocumentCommand,
    setEditTarget(target) {
      editTarget = target;
      publish();
    },
    setActiveVariant: refuseDocumentCommand,
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
    execute: refuseDocumentCommand,
    executeDesign(command: CatalogDesignCommand) {
      core.applyDesignCommand(command);
      designRevision += 1;
      notice = null;
      publish();
    },
    executeDocument: refuseDocumentCommand,
    undo: refuseDocumentCommand,
    redo: refuseDocumentCommand,
    loadDocument: refuseDocumentCommand,
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
    boardDocuments: () => [],
    boardStores: () => [],
    designInput(): DesignInput {
      const catalog = core.getSnapshot().catalog;
      const design = buildCatalogEditorSnapshot({
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
      }).design;
      return {
        tokens: design.tokens,
        breakpoints: design.settings?.breakpoints,
      };
    },
    filenameFor: (id) => `${id}.json`,
    fileHandle: () => undefined,
    rememberHandle: () => {},
    async saveOpenDocument() {
      return false;
    },
    async saveDesign() {
      if (!catalogDirty()) return false;
      await core.persist(catalogPort);
      catalogBaseline = JSON.stringify(core.getSnapshot().catalog);
      publish();
      return true;
    },
    documentStores: () => [],
    markDocumentSaved: () => publish(),
  };
}
