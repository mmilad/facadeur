import {
  resolveVariantDocument,
  toFlat,
  toNested,
  type DefaultKind,
  type FlatDocument,
} from '@facadeur/core';
import type { YjsDocumentStore } from '@facadeur/store-yjs';
import { componentVariantsFor, publicEventsFor, publicFieldsFor } from '../component-contract.js';
import { layerTree, nodeIdForHit, renderIdForNode } from '../selection-model.js';
import { isDocumentDirty, type SavedJsonBaselines } from '../save-state.js';
import type { ViewportChromeSettings } from '../viewport-chrome.js';
import type { StyleEditMode } from '../viewport-edit.js';
import type { DrillParent, DrillStackFrame } from '../drill-navigation.js';
import { isKind } from './kinds.js';
import type {
  AssetSummary,
  EditorDrag,
  EditorNotice,
  EditorSnapshot,
  EditorTool,
} from './types.js';

export interface SnapshotBuildContext {
  workspace: DefaultKind;
  openId: string;
  document: FlatDocument;
  design: FlatDocument;
  selectedNodeId: string | null;
  selectedRenderId: string | null;
  focusViewportId: string | null;
  selectedViewportId: string | null;
  viewportChrome: Readonly<Record<string, ViewportChromeSettings>>;
  editTarget: StyleEditMode;
  activeVariantName: string | null;
  notice: EditorNotice | null;
  zoomLabel: string;
  tool: EditorTool;
  drag: EditorDrag | null;
  generation: number;
  designRevision: number;
  revision: number;
  order: readonly string[];
  assetStores: ReadonlyMap<string, YjsDocumentStore>;
  savedJson: SavedJsonBaselines;
  designId: string;
  canUndo: boolean;
  canRedo: boolean;
  drillParents: readonly DrillParent[];
}

export function buildEditorSnapshot(ctx: SnapshotBuildContext): EditorSnapshot {
  const document = ctx.document;
  const activeDocument =
    ctx.activeVariantName && document.kind === 'component'
      ? toFlat(resolveVariantDocument(toNested(document), ctx.activeVariantName))
      : document;
  const design = ctx.design;
  const selectedNode = ctx.selectedNodeId
    ? (activeDocument.nodes[ctx.selectedNodeId] ?? null)
    : null;
  const assets: AssetSummary[] = [];
  const catalog: AssetSummary[] = [];
  const catalogDocuments = new Map<string, FlatDocument>();
  for (const id of ctx.order) {
    const store = ctx.assetStores.get(id);
    if (!store) continue;
    const doc = store.getDocument();
    catalogDocuments.set(doc.id, doc);
    if (!isKind(doc.kind)) continue;
    catalog.push({ id: doc.id, name: doc.name, kind: doc.kind, group: doc.group });
    if (doc.kind !== ctx.workspace) continue;
    assets.push({ id: doc.id, name: doc.name, kind: doc.kind });
  }
  let componentTarget: FlatDocument | null = null;
  if (selectedNode?.type === 'instance') {
    componentTarget = catalogDocuments.get(selectedNode.component) ?? null;
  }
  const componentFields = componentTarget ? publicFieldsFor(componentTarget, catalogDocuments) : [];
  const componentEvents = componentTarget ? publicEventsFor(componentTarget, catalogDocuments) : [];
  const componentVariants = componentTarget ? componentVariantsFor(componentTarget) : [];
  return {
    workspace: ctx.workspace,
    openId: ctx.openId,
    paintRoot: document.kind !== 'page',
    assets,
    layers: layerTree(activeDocument),
    document,
    activeDocument,
    design,
    selectedNodeId: ctx.selectedNodeId,
    selectedRenderId: ctx.selectedRenderId,
    selectedNode,
    focusViewportId: ctx.focusViewportId,
    selectedViewportId: ctx.selectedViewportId,
    viewportChrome: ctx.viewportChrome,
    editTarget: ctx.editTarget,
    activeVariantName: ctx.activeVariantName,
    componentTarget,
    componentFields,
    componentEvents,
    componentVariants,
    canUndo: ctx.canUndo,
    canRedo: ctx.canRedo,
    notice: ctx.notice,
    zoomLabel: ctx.zoomLabel,
    catalog,
    tool: ctx.tool,
    drag: ctx.drag,
    generation: ctx.generation,
    designRevision: ctx.designRevision,
    revision: ctx.revision,
    documentDirty: isDocumentDirty(ctx.savedJson, ctx.openId, document),
    designDirty: isDocumentDirty(ctx.savedJson, ctx.designId, design),
    drillParents: ctx.drillParents,
  };
}

export function readViewportChromeForOpenDocument(
  openId: string,
  viewportChromeStore: ReadonlyMap<string, ViewportChromeSettings>,
): Record<string, ViewportChromeSettings> {
  const prefix = `${openId}:`;
  const out: Record<string, ViewportChromeSettings> = {};
  for (const [key, value] of viewportChromeStore) {
    if (!key.startsWith(prefix)) continue;
    out[key.slice(prefix.length)] = value;
  }
  return out;
}

export function buildDrillParentsForSnapshot(
  drillStack: readonly DrillStackFrame[],
  assetStores: ReadonlyMap<string, YjsDocumentStore>,
): DrillParent[] {
  return drillStack.map((frame) => {
    const live = assetStores.get(frame.documentId)?.getDocument();
    return live ? { ...frame, documentName: live.name } : frame;
  });
}

export function resolveRenderedSelection(
  document: FlatDocument,
  renderedId: string,
  paintRoot: boolean,
): { nodeId: string; renderId: string } | null {
  const nodeId = nodeIdForHit(document, renderedId, paintRoot);
  if (!nodeId) return null;
  const renderId = renderIdForNode(document, nodeId, paintRoot);
  if (!renderId) return null;
  return { nodeId, renderId };
}
