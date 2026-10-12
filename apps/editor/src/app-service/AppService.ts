import type { CoreController, NodeDefinitionModel } from '@facadeur/core';
import type { DesignPropDefinition, FieldValue, JsonSchemaObject, Node } from '@facadeur/domain';
import { createCatalogUuid } from '@facadeur/core';
import type { EditorSession } from '../domain/session/types';
import type { CatalogDefinitionKind, EditorCatalogPort } from '../domain/project/catalog-port';
import { InspectorService } from './inspector';
import { assetKindToCatalogMap, blankCatalogDefinition } from '../domain/catalog/blank-definition';
import { catalogAssetSummaries } from '../domain/catalog/asset-list';
import type { EditorEvent, EditorEventDataMap } from '../domain/sidebar/events';
import { EditorEventType } from '../domain/sidebar/events';
import { catalogLayerDropTarget } from '../domain/catalog/catalog-layer-move';
import {
  catalogLayerInsertTarget,
  catalogPlacementAllowed,
  type LayerInsertEntry,
} from '../domain/catalog/catalog-layer-insert';
import { catalogNodeFromInsertEntry } from '../domain/catalog/layer-node-draft';
import { refusalMessage } from '../domain/editing';
import { findNodeByUuid, findParentOfNode } from '@facadeur/core';
import type { LayerItem } from '../domain/catalog/layer-tree';
import { buildInspectorSidebarViewModel } from './sidebar-view-model';

/** Editor entry: catalog editing via {@link CoreController}, chrome via {@link EditorSession}. */
export class AppService {
  private readonly core: CoreController;
  readonly session: EditorSession;
  readonly inspector: InspectorService;
  private readonly catalogPort: EditorCatalogPort;
  private snapshotSource: ReturnType<EditorSession['getSnapshot']> | null = null;
  private snapshotValue: ReturnType<EditorSession['getSnapshot']> | null = null;

  constructor(options: {
    core: CoreController;
    session: EditorSession;
    catalogPort: EditorCatalogPort;
  }) {
    this.core = options.core;
    this.session = options.session;
    this.inspector = new InspectorService(options.core);
    this.catalogPort = options.catalogPort;
  }

  subscribe(listener: () => void) {
    const unsubCore = this.core.subscribe(listener);
    const unsubSession = this.session.subscribe(listener);
    return () => {
      unsubCore();
      unsubSession();
    };
  }

  getSnapshot() {
    const source = this.session.getSnapshot();
    if (source === this.snapshotSource && this.snapshotValue) return this.snapshotValue;
    const nodeId = source.selectedCatalogNodeUuid ?? source.openDefinition?.root.uuid ?? '';
    const inspector = nodeId ? this.getInspectorSidebarModel(nodeId) : null;
    this.snapshotSource = source;
    this.snapshotValue = {
      ...source,
      sidebar: { ...source.sidebar, inspector },
    };
    return this.snapshotValue;
  }

  getCoreSnapshot() {
    return this.core.getSnapshot();
  }

  getCatalog() {
    return this.core.getSnapshot().catalog;
  }

  getDefinitionDisplayName(uuid: string) {
    return this.core.getDefinitionDisplayName(uuid);
  }

  getActiveBreakpoints() {
    return this.core.getActiveBreakpoints();
  }

  getDesignSnapshot() {
    return this.core.getDesignSnapshot();
  }

  getSchemas() {
    return this.core.getSchemas();
  }

  getSchema(uuid: string) {
    return this.core.getSchema(uuid);
  }

  getDesignProps() {
    return this.core.getDesignProps();
  }

  buildOpenDefinition() {
    return this.core.node.element.buildOpenDefinition();
  }

  resolveSchemaForOpenDefinition() {
    return this.core.node.schema.resolveForOpenDefinition();
  }

  effectiveSchemaForOpenDefinition() {
    return this.core.node.schema.effectiveForOpenDefinition();
  }

  getInspectorInputs() {
    return this.core.node.config.inspectorInputs();
  }

  patchNodeStyleRecord(nodeUuid: string, record: Readonly<Record<string, string>>) {
    this.core.patchNodeStyleRecord(nodeUuid, record);
  }

  insertCatalogNode(parentUuid: string, index: number, node: Node) {
    this.core.insertCatalogNode(parentUuid, index, node);
  }

  moveCatalogNode(nodeUuid: string, parentUuid: string, index: number) {
    this.core.moveCatalogNode(nodeUuid, parentUuid, index);
  }

  removeCatalogNode(nodeUuid: string) {
    this.core.removeCatalogNode(nodeUuid);
  }

  get design() {
    return this.getSnapshot().design;
  }

  getInspectorSidebarModel(nodeUuid: string) {
    const model = this.inspector.getModel(nodeUuid);
    if (!model) return null;
    const formKey = `${this.session.getSnapshot().openId}:${nodeUuid}`;
    return buildInspectorSidebarViewModel(model, formKey);
  }

  async dispatchEditorEvent(event: EditorEvent) {
    try {
      switch (event.type) {
        case EditorEventType.AssetRename:
          await this.patchDefinition(event.data.assetId, { name: event.data.name });
          return;
        case EditorEventType.AssetDelete:
          await this.deleteDefinition(event.data.assetId);
          return;
        case EditorEventType.AssetDragStart:
          this.session.beginDrag({ kind: 'asset', assetId: event.data.assetId });
          return;
        case EditorEventType.AssetDragEnd:
          this.session.endDrag();
          return;
        case EditorEventType.LayerSelect:
          this.session.selectNode(event.data.nodeId);
          return;
        case EditorEventType.LayerDragStart:
          this.session.beginDrag({ kind: 'node', nodeId: event.data.nodeId });
          return;
        case EditorEventType.LayerDragEnd:
          this.session.endDrag();
          return;
        case EditorEventType.LayerDelete:
          await this.deleteSidebarLayer(event.data.nodeId);
          return;
        case EditorEventType.LayerInsert:
          await this.insertSidebarLayer(event.data);
          return;
        case EditorEventType.LayerMove:
          await this.moveSidebarLayer(event.data.sourceId, event.data.targetId, event.data.zone);
          return;
        case EditorEventType.InspectorFieldChange:
          this.inspector.updateField({
            nodeUuid: event.data.nodeId,
            path: event.data.path,
            value: event.data.value,
          });
          return;
        case EditorEventType.SurfaceNavigate:
          // Shell-only events share the same contract but have no AppService operation.
          return;
        case EditorEventType.ToolSet:
          this.session.setTool(event.data.tool);
          return;
        case EditorEventType.ZoomBy:
          this.session.zoomBy(event.data.factor);
          return;
        case EditorEventType.ZoomReset:
          this.session.resetZoom();
          return;
        case EditorEventType.CanvasFit:
          this.session.fit();
          return;
        case EditorEventType.ViewportFocus:
          this.session.setFocusViewport(event.data.breakpointId);
          return;
        case EditorEventType.ViewportSelect:
          this.session.selectViewport(event.data.breakpointId);
          return;
        case EditorEventType.EditTargetSet:
          this.session.setEditTarget(event.data.target);
          return;
        case EditorEventType.CatalogPersist:
          await this.persistCatalog();
          return;
        case EditorEventType.DesignPropsSave:
          await this.persistCatalog();
          this.session.setNotice('Props saved', 'info');
          return;
        case EditorEventType.SchemaUpsert:
          this.upsertSchema(event.data.uuid, event.data.schema);
          return;
        case EditorEventType.SchemaRemove:
          this.removeSchema(event.data.uuid);
          await this.saveSchemas();
          return;
        case EditorEventType.SchemasSave:
          await this.saveSchemas();
          this.session.setNotice('Schemas saved', 'info');
          return;
        case EditorEventType.DefinitionSchemaSet:
          await this.patchDefinition(event.data.definitionId, { schema: event.data.schema });
          this.session.setNotice(
            event.data.schema.kind === 'inline'
              ? 'Using inline schema on this definition'
              : 'Schema link updated',
            'info',
          );
          return;
        case EditorEventType.PreviewFieldSet:
          await this.patchPreviewField(event.data.field, event.data.value);
          return;
        case EditorEventType.DesignPropUpsert:
          this.upsertDesignProp(event.data.prop);
          return;
        case EditorEventType.DesignPropRemove:
          this.removeDesignProp(event.data.uuid);
          return;
        case EditorEventType.DesignCommandExecute:
          this.session.executeDesign(event.data.command);
          return;
        case EditorEventType.DesignTokenRemove: {
          const refs = this.core.getTokensReferencingUUID(event.data.uuid);
          if (refs.length) {
            this.session.setNotice(
              `Cannot remove "${event.data.label}": {token:${event.data.uuid}} is referenced in ${refs.join(', ')}`,
              'error',
            );
            return;
          }
          this.session.executeDesign({
            type: 'removeToken',
            family: event.data.family,
            uuid: event.data.uuid,
          });
          return;
        }
        case EditorEventType.BreakpointsSet: {
          const breakpoints = [...event.data.breakpoints];
          this.session.executeDesign({ type: 'setBreakpoints', breakpoints });
          const active = this.core.getActiveBreakpoints();
          const snapshot = this.session.getSnapshot();
          if (
            snapshot.focusViewportId &&
            !active.some((item) => item.uuid === snapshot.focusViewportId)
          ) {
            this.session.setFocusViewport(active[0]?.uuid ?? null);
            this.session.setEditTarget('base');
          }
          if (
            snapshot.selectedViewportId &&
            !active.some((item) => item.uuid === snapshot.selectedViewportId)
          ) {
            this.session.selectViewport(active[0]?.uuid ?? null);
          }
          if (event.data.focusBreakpointId) {
            this.session.setFocusViewport(event.data.focusBreakpointId);
            this.session.setEditTarget('viewport');
          }
          return;
        }
        case EditorEventType.NoticeSet:
          this.session.setNotice(event.data.text, event.data.tone);
          return;
        case EditorEventType.NodeSelect:
          this.session.selectNode(event.data.nodeId);
          return;
        case EditorEventType.NodeInsert:
          this.insertCatalogNode(event.data.parentId, event.data.index, event.data.node);
          return;
        case EditorEventType.NodeMove:
          this.moveCatalogNode(event.data.nodeId, event.data.parentId, event.data.index);
          return;
        case EditorEventType.NodeStyleRecordSet:
          this.patchNodeStyleRecord(event.data.nodeId, event.data.style);
          return;
      }
    } catch (failure) {
      this.session.setNotice(
        failure instanceof Error ? failure.message : 'Could not apply editor action',
        'error',
      );
    }
  }

  private async insertSidebarLayer(intent: EditorEventDataMap[EditorEventType.LayerInsert]) {
    const snapshot = this.session.getSnapshot();
    const definition = snapshot.openDefinition;
    const item = findLayer(snapshot.layers, intent.targetId);
    if (!definition || !item) return;
    const spot = catalogLayerInsertTarget(definition, item, intent.placement);
    const parent = spot ? findNodeByUuid(definition.root, spot.parentUuid) : null;
    if (!spot || !parent) return;
    const entry: Extract<LayerInsertEntry, { kind: 'instance' | 'primitive' }> | null =
      intent.kind === 'instance'
        ? {
            kind: 'instance',
            assetId: intent.value,
            label: snapshot.catalog.find((asset) => asset.id === intent.value)?.name ?? '',
          }
        : ['frame', 'text', 'image'].includes(intent.value)
          ? {
              kind: 'primitive',
              tool: intent.value as 'frame' | 'text' | 'image',
              label: intent.value[0]!.toUpperCase() + intent.value.slice(1),
            }
          : null;
    if (!entry) return;
    if (!catalogPlacementAllowed(definition.kind, parent, entry, snapshot.catalog)) {
      const assetKind =
        entry.kind === 'instance'
          ? snapshot.catalog.find((asset) => asset.id === entry.assetId)?.kind
          : undefined;
      this.session.setNotice(
        refusalMessage(
          definition.kind,
          entry.kind === 'instance' ? 'instance' : entry.tool,
          assetKind,
        ),
        'error',
      );
      return;
    }
    const node = catalogNodeFromInsertEntry(entry);
    if (!node) return;
    this.insertCatalogNode(spot.parentUuid, spot.index, node);
    await this.persistCatalog();
    this.session.selectNode(node.uuid);
  }

  private async deleteSidebarLayer(nodeId: string) {
    const snapshot = this.session.getSnapshot();
    const definition = snapshot.openDefinition;
    const item = findLayer(snapshot.layers, nodeId);
    if (!definition || !item || item.virtual || nodeId === definition.root.uuid) return;
    const parent = findParentOfNode(definition.root, nodeId);
    this.removeCatalogNode(nodeId);
    await this.persistCatalog();
    this.session.selectNode(parent?.parent.uuid ?? definition.root.uuid);
  }

  private async moveSidebarLayer(
    sourceId: string,
    targetId: string,
    zone: 'before' | 'inside' | 'after',
  ) {
    const definition = this.session.getSnapshot().openDefinition;
    if (!definition) return;
    const target = catalogLayerDropTarget(definition, sourceId, targetId, zone);
    if (!target) return;
    this.moveCatalogNode(sourceId, target.parentUuid, target.index);
    await this.persistCatalog();
    this.session.selectNode(sourceId);
  }

  async persistCatalog() {
    await this.core.persist(this.catalogPort);
  }

  async createDefinition(
    kind: CatalogDefinitionKind,
    definition: Omit<NodeDefinitionModel, 'uuid'> & { uuid?: string },
  ) {
    return this.core.createDefinitionFromPort(this.catalogPort, kind, definition);
  }

  async createAsset(kind: string) {
    if (kind !== 'atom' && kind !== 'component' && kind !== 'page') return null;
    const catalogKind = assetKindToCatalogMap(kind);
    if (!catalogKind) return null;
    const definition = blankCatalogDefinition(kind, catalogAssetSummaries(this.core));
    return this.createDefinition(catalogKind, definition);
  }

  async patchDefinition(uuid: string, patch: Partial<NodeDefinitionModel>) {
    const located = this.core.getDefinition(uuid);
    if (!located) throw new Error(`Unknown catalog definition "${uuid}"`);
    this.core.patchDefinition(located.kind, uuid, patch);
  }

  async deleteDefinition(uuid: string) {
    await this.core.deleteDefinitionFromPort(this.catalogPort, uuid);
  }

  upsertSchema(uuid: string, schema: JsonSchemaObject) {
    this.core.upsertSchema(uuid, schema);
  }

  removeSchema(uuid: string) {
    this.core.removeSchema(uuid);
  }

  async saveSchemas() {
    await this.persistCatalog();
  }

  upsertDesignProp(input: { uuid?: string; name: string; value: string }) {
    const name = input.name.trim();
    if (!name) throw new Error('Prop name is required');
    const uuid = input.uuid ?? createCatalogUuid();
    const prop: DesignPropDefinition = { uuid, name, value: input.value };
    this.core.upsertDesignProp(prop);
    return prop;
  }

  removeDesignProp(uuid: string) {
    this.core.removeDesignProp(uuid);
  }

  /** Update definition-level preview defaults (`config.previewData.fields`). */
  async patchPreviewField(field: string, value: FieldValue | undefined) {
    const definition = this.core.getSnapshot().openDefinition;
    if (!definition) return;
    this.core.patchDefinitionPreviewField(definition.uuid, field, value);
  }
}

export function createAppService(options: {
  core: CoreController;
  session: EditorSession;
  catalogPort: EditorCatalogPort;
}) {
  return new AppService(options);
}

function findLayer(root: LayerItem | null, nodeId: string): LayerItem | null {
  if (!root) return null;
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = findLayer(child, nodeId);
    if (found) return found;
  }
  return null;
}
