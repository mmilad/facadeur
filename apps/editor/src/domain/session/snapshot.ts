import {
  resolveVariantDocument,
  toFlat,
  toNested,
  type DefaultKind,
  type FlatDocument,
  type FlatNode,
} from '@facadeur/core';
import { withPreviewData } from '@facadeur/core';
import type { ControllerDocumentStore } from '@facadeur/core';
import {
  automaticFieldGroupsFor,
  componentVariantsFor,
  publicEventsFor,
  publicFieldsFor,
} from '../schema/component-contract.js';
import { ownsVariantContract, variantSummaries } from '../edits/variant-edit.js';
import { nodeIdForHit, renderIdForNode } from '../selection/selection-model.js';
import {
  fieldContextForSelection,
  type NestedFieldContext,
  type NestedSelection,
  virtualLayerTree,
} from '../nested-selection.js';
import { isDocumentDirty, type SavedJsonBaselines } from '../assets/save-state.js';
import type { ViewportChromeSettings } from '../viewport/viewport-chrome.js';
import type { StyleEditMode } from '../viewport/viewport-edit.js';
import type { DrillParent, DrillStackFrame } from '../navigation/drill-navigation.js';
import { isKind } from './kinds.js';
import { overlaySchemaDefaults } from '../schema/schema-defaults.js';
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
  nestedSelection: NestedSelection | null;
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
  assetStores: ReadonlyMap<string, ControllerDocumentStore>;
  catalogDocuments?: ReadonlyMap<string, FlatDocument>;
  savedJson: SavedJsonBaselines;
  designId: string;
  canUndo: boolean;
  canRedo: boolean;
  drillParents: readonly DrillParent[];
}

export function buildEditorSnapshot(ctx: SnapshotBuildContext): EditorSnapshot {
  const document = ctx.document;
  const activeDocument =
    ctx.activeVariantName && ownsVariantContract(document.kind)
      ? toFlat(
          resolveVariantDocument(toNested(document), ctx.activeVariantName, {
            preserveStyleLayers: true,
          }),
        )
      : document;
  const design = ctx.design;
  const selectedNode = ctx.selectedNodeId
    ? (activeDocument.nodes[ctx.selectedNodeId] ?? null)
    : null;
  const assets: AssetSummary[] = [];
  const catalog: AssetSummary[] = [];
  const catalogDocuments = new Map<string, FlatDocument>();
  for (const id of ctx.order) {
    const doc = ctx.catalogDocuments
      ? ctx.catalogDocuments.get(id)
      : ctx.assetStores.get(id)?.getDocument();
    if (!doc) continue;
    catalogDocuments.set(doc.id, doc);
    if (!isKind(doc.kind)) continue;
    catalog.push({
      id: doc.id,
      name: doc.name,
      kind: doc.kind,
      group: doc.group,
      ...(ownsVariantContract(doc.kind) ? { variants: variantSummaries(doc) } : {}),
    });
    if (doc.kind !== ctx.workspace) continue;
    assets.push({
      id: doc.id,
      name: doc.name,
      kind: doc.kind,
      ...(ownsVariantContract(doc.kind) ? { variants: variantSummaries(doc) } : {}),
    });
  }
  let componentTarget: FlatDocument | null = null;
  if (selectedNode?.type === 'instance') {
    componentTarget = catalogDocuments.get(selectedNode.component) ?? null;
  }
  const componentFields = componentTarget
    ? publicFieldsFor(componentTarget, catalogDocuments, design.schemaCatalog)
    : [];
  const automaticFieldGroups = automaticFieldGroupsFor(
    activeDocument,
    catalogDocuments,
    design.schemaCatalog,
  );
  const documentScopeFields =
    activeDocument.kind === 'atom' ||
    activeDocument.kind === 'component' ||
    activeDocument.kind === 'section'
      ? publicFieldsFor(activeDocument, catalogDocuments, design.schemaCatalog)
      : activeDocument.fields;
  const componentEvents = componentTarget ? publicEventsFor(componentTarget, catalogDocuments) : [];
  const componentVariants = componentTarget ? componentVariantsFor(componentTarget) : [];
  const nestedSelection = ctx.nestedSelection;
  const fieldContext: NestedFieldContext | null = fieldContextForSelection({
    document: activeDocument,
    selectedNode,
    nestedSelection,
    catalog: catalogDocuments,
    schemaCatalog: design.schemaCatalog,
    childFields: (ownerNodeId, instancePath) => {
      const owner = activeDocument.nodes[ownerNodeId];
      if (owner?.type !== 'instance') return undefined;
      const childFields = (
        owner as FlatNode & {
          childFields?: Record<string, Record<string, import('@facadeur/core').FieldValue>>;
        }
      ).childFields;
      return childFields?.[instancePath];
    },
  });
  const nestedSelectionWithFields = nestedSelection ? { ...nestedSelection, fieldContext } : null;
  const prepareDocument = (source: FlatDocument, variant?: string): FlatDocument => {
    const fields = publicFieldsFor(source, catalogDocuments, design.schemaCatalog);
    const prepared = overlaySchemaDefaults(toNested(source), fields);
    return toFlat(withPreviewData(prepared, variant, fields));
  };
  const layers = virtualLayerTree(activeDocument, {
    catalog: catalogDocuments,
    schemaCatalog: design.schemaCatalog,
    paintRoot: activeDocument.kind !== 'page',
    prepareDocument,
  });
  return {
    workspace: ctx.workspace,
    openId: ctx.openId,
    paintRoot: document.kind !== 'page',
    assets,
    layers,
    document,
    activeDocument,
    design,
    selectedNodeId: ctx.selectedNodeId,
    selectedRenderId: ctx.selectedRenderId,
    selectedNode,
    nestedSelection: nestedSelectionWithFields,
    fieldContext,
    focusViewportId: ctx.focusViewportId,
    selectedViewportId: ctx.selectedViewportId,
    viewportChrome: ctx.viewportChrome,
    editTarget: ctx.editTarget,
    activeVariantName: ctx.activeVariantName,
    componentTarget,
    componentFields,
    automaticFieldGroups,
    documentScopeFields,
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
  assetStores: ReadonlyMap<string, ControllerDocumentStore>,
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
