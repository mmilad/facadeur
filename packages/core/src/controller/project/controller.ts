import type {
  CatalogMapKey,
  FieldExposure,
  JsonSchemaObject,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import { DocumentError } from '../../document/errors';
import type { CoreControllerHost } from '../../types/host';
import type { CatalogPort, CoreSnapshot } from '../../types/core-contracts';
import type { CatalogDefinitionPort } from '../../types/catalog-definition-port';
import { applyCatalogDesignCommand, type CatalogDesignCommand } from './catalog/design-commands';
import {
  createCatalogDefinition,
  deleteCatalogDefinitionRecord,
  patchCatalogDefinitionRecord,
  removeCatalogSchema,
  upsertCatalogSchema,
} from './catalog/definition-ops';
import { removeCatalogDesignProp, upsertCatalogDesignProp } from './catalog/props-ops';
import { patchNodeClasses } from './catalog/node-classes';
import {
  findDefinition,
  findNodeByUuid,
  patchNodeData,
  pruneDefinitionValuesForSchema,
  patchCatalogDefinitionPreviewField,
  patchNodeDataRecord,
  patchNodeComposition,
  patchDefinitionFieldExposure,
  patchNodeName,
  patchNodeDomAttributes,
  patchNodeDomText,
  patchNodeTagName,
} from './catalog/ops';
import { reconcileDefinitionBindingsForSchemaChange } from './catalog/schema-repeater';
import { reconcileCatalogValuesForSchemaChange } from './catalog/schema-values';
import {
  updateDefinitionInstanceField,
  updateDefinitionStaticField,
} from './catalog/static-fields';
import {
  duplicateCatalogNode,
  insertCatalogNode,
  moveCatalogNode,
  removeCatalogNode,
} from './catalog/tree-ops';
import type { InspectorFormChangeTarget } from './inspector-form-change';
import { emptyProjectCatalog, validateProjectCatalog } from './catalog/validate';
import {
  definitionDisplayName,
  definitionSummaries,
  effectiveNodeTagName,
  projectStyleSuggestions,
  tokenByReference,
  tokenByUuid,
  tokenReferencePaths,
} from './catalog/queries';
import { NodeController } from './node/controller';
import { activeBreakpoints, configuredBreakpoints } from '../../tokens/resolve';
import { emptyTokenTree } from '../style/tokens/global/tree';

/**
 * Single source of truth for {@link ProjectCatalog} and catalog editing selection.
 * Design tokens, fonts, and {@link ProjectCatalog.globalStyles} live on the catalog snapshot;
 * node/schema preview flows go through {@link NodeController}.
 */
export class CoreController implements CoreControllerHost {
  private catalog: ProjectCatalog;
  private openDefinitionId: string | null = null;
  private selectedNodeUuid: string | null = null;
  private readonly listeners = new Set<() => void>();
  readonly node: NodeController;

  constructor(catalog: ProjectCatalog = emptyProjectCatalog()) {
    this.catalog = validateProjectCatalog(structuredClone(catalog)) as ProjectCatalog;
    this.node = new NodeController(this);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): CoreSnapshot {
    const openDefinition = this.openDefinitionId
      ? (findDefinition(this.catalog, this.openDefinitionId)?.definition ?? null)
      : null;
    return {
      catalog: structuredClone(this.catalog) as ProjectCatalog,
      openDefinitionId: this.openDefinitionId,
      openDefinition: openDefinition ? structuredClone(openDefinition) : null,
      selectedNodeUuid: this.selectedNodeUuid,
    };
  }

  getDefinition(uuid: string) {
    const located = findDefinition(this.catalog, uuid);
    return located ? { ...located, definition: structuredClone(located.definition) } : null;
  }

  getDefinitionDisplayName(uuid: string) {
    const definition = findDefinition(this.catalog, uuid)?.definition;
    return definition ? definitionDisplayName(this.catalog, definition) : null;
  }

  getDefinitionSummaries() {
    return definitionSummaries(this.catalog);
  }

  getEffectiveNodeTagName(nodeUuid: string) {
    const definition = this.openDefinitionId
      ? findDefinition(this.catalog, this.openDefinitionId)?.definition
      : undefined;
    const node = definition ? findNodeByUuid(definition.root, nodeUuid) : undefined;
    return node ? (effectiveNodeTagName(this.catalog, node) ?? null) : null;
  }

  getActiveBreakpoints() {
    return activeBreakpoints(this.catalog.globalStyles?.breakpoints);
  }

  getDesignSnapshot() {
    return {
      tokens: structuredClone(this.catalog.tokens ?? emptyTokenTree()),
      ...(this.catalog.icons ? { icons: structuredClone(this.catalog.icons) } : {}),
      breakpoints: configuredBreakpoints(this.catalog.globalStyles?.breakpoints),
    };
  }

  getSchemas() {
    return Object.entries(this.catalog.schemas ?? {}).map(([uuid, schema]) => ({
      uuid,
      schema: structuredClone(schema),
    }));
  }

  getSchema(uuid: string) {
    const schema = this.catalog.schemas?.[uuid];
    return schema ? structuredClone(schema) : undefined;
  }

  getDesignProps() {
    return Object.values(this.catalog.props ?? {}).map((prop) => structuredClone(prop));
  }

  getProjectStyleSuggestions() {
    return projectStyleSuggestions(this.catalog);
  }

  getTokenByUUID(uuid: string) {
    return tokenByUuid(this.catalog, uuid);
  }

  getTokenByReference(value: unknown) {
    return tokenByReference(this.catalog, value);
  }

  getTokensReferencingUUID(uuid: string) {
    return tokenReferencePaths(this.catalog, uuid);
  }

  replaceCatalog(catalog: unknown) {
    this.catalog = validateProjectCatalog(catalog) as ProjectCatalog;
    if (this.openDefinitionId && !findDefinition(this.catalog, this.openDefinitionId)) {
      this.openDefinitionId = null;
      this.selectedNodeUuid = null;
    }
    this.publish();
  }

  openDefinition(uuid: string) {
    const located = findDefinition(this.catalog, uuid);
    if (!located) {
      throw new DocumentError('schema', `Unknown catalog definition "${uuid}"`);
    }
    this.openDefinitionId = uuid;
    this.selectedNodeUuid = located.definition.root.uuid;
    this.publish();
  }

  closeDefinition() {
    if (!this.openDefinitionId && !this.selectedNodeUuid) return;
    this.openDefinitionId = null;
    this.selectedNodeUuid = null;
    this.publish();
  }

  applyDesignCommand(command: CatalogDesignCommand) {
    this.catalog = applyCatalogDesignCommand(this.catalog, command);
    this.publish();
  }

  createDefinition(kind: CatalogMapKey, definition: NodeDefinition) {
    this.commitCatalog(createCatalogDefinition(this.catalog, kind, definition));
  }

  patchDefinition(kind: CatalogMapKey, uuid: string, patch: Partial<NodeDefinition>) {
    const withPrunedValues =
      patch.schema?.kind === 'inline'
        ? pruneDefinitionValuesForSchema(this.catalog, uuid, patch.schema.schema)
        : this.catalog;
    const patched = patchCatalogDefinitionRecord(withPrunedValues, kind, uuid, patch);
    const withReconciledBindings = patch.schema
      ? reconcileDefinitionBindingsForSchemaChange(this.catalog, patched, uuid)
      : patched;
    const nextCatalog = patch.schema
      ? reconcileCatalogValuesForSchemaChange(this.catalog, withReconciledBindings)
      : withReconciledBindings;
    this.commitCatalog(nextCatalog, () => {
      if (this.openDefinitionId === uuid) {
        const located = findDefinition(this.catalog, uuid);
        if (located) this.selectedNodeUuid = located.definition.root.uuid;
      }
    });
  }

  deleteDefinition(kind: CatalogMapKey, uuid: string) {
    this.commitCatalog(deleteCatalogDefinitionRecord(this.catalog, kind, uuid), () => {
      if (this.openDefinitionId === uuid) {
        this.openDefinitionId = null;
        this.selectedNodeUuid = null;
      }
    });
  }

  upsertSchema(uuid: string, schema: JsonSchemaObject) {
    const updated = upsertCatalogSchema(this.catalog, uuid, schema);
    this.commitCatalog(reconcileCatalogValuesForSchemaChange(this.catalog, updated));
  }

  removeSchema(uuid: string) {
    this.commitCatalog(removeCatalogSchema(this.catalog, uuid));
  }

  upsertDesignProp(prop: import('@facadeur/domain').DesignPropDefinition) {
    this.commitCatalog(upsertCatalogDesignProp(this.catalog, prop));
  }

  removeDesignProp(uuid: string) {
    this.commitCatalog(removeCatalogDesignProp(this.catalog, uuid));
  }

  patchNodeField(field: string, value: unknown) {
    if (!this.openDefinitionId || !this.selectedNodeUuid) return;
    this.commitCatalog(
      patchNodeData(this.catalog, this.openDefinitionId, this.selectedNodeUuid, field, value),
    );
  }

  patchNodeDataRecord(nodeUuid: string, record: Readonly<Record<string, unknown>>) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(patchNodeDataRecord(this.catalog, this.openDefinitionId, nodeUuid, record));
  }

  patchNodeComposition(nodeUuid: string, patch: Parameters<typeof patchNodeComposition>[3]) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(patchNodeComposition(this.catalog, this.openDefinitionId, nodeUuid, patch));
  }

  private patchNodeExposure(nodeUuid: string, exposure: FieldExposure) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(
      patchDefinitionFieldExposure(this.catalog, this.openDefinitionId, nodeUuid, exposure),
    );
  }

  private patchStaticField(
    field: string,
    setting: 'isStatic' | 'value' | 'expose',
    value: boolean | import('@facadeur/domain').FieldValue,
  ) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(
      updateDefinitionStaticField(this.catalog, this.openDefinitionId, field, setting, value),
    );
  }

  private patchInstanceStaticField(
    instanceUuid: string,
    field: string,
    setting: 'isStatic' | 'value' | 'expose',
    value: boolean | import('@facadeur/domain').FieldValue,
  ) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(
      updateDefinitionInstanceField(
        this.catalog,
        this.openDefinitionId,
        instanceUuid,
        field,
        setting,
        value,
      ),
    );
  }

  patchNodeDomAttributeRecord(nodeUuid: string, record: Readonly<Record<string, string>>) {
    if (!this.openDefinitionId) return;
    const definition = findDefinition(this.catalog, this.openDefinitionId)?.definition;
    const node = definition ? findNodeByUuid(definition.root, nodeUuid) : undefined;
    if (!node) return;
    const current = node.dom.attributes ?? {};
    const next = Object.fromEntries(
      Object.entries(record).filter(
        ([key, value]) => key !== 'class' && key.trim() && value !== '',
      ),
    );
    const patch = {
      ...Object.fromEntries(
        Object.keys(current)
          .filter((key) => key !== 'class' && !(key in next))
          .map((key) => [key, '']),
      ),
      ...next,
    };
    this.commitCatalog(
      patchNodeDomAttributes(this.catalog, this.openDefinitionId, nodeUuid, patch),
    );
  }

  patchNodeDomText(nodeUuid: string, text: string) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(patchNodeDomText(this.catalog, this.openDefinitionId, nodeUuid, text));
  }

  patchNodeClassList(nodeUuid: string, classes: readonly string[]) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(patchNodeClasses(this.catalog, this.openDefinitionId, nodeUuid, classes));
  }

  patchNodeTagName(nodeUuid: string, tagName: string) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(patchNodeTagName(this.catalog, this.openDefinitionId, nodeUuid, tagName));
  }

  patchNodeName(nodeUuid: string, name: string) {
    if (!this.openDefinitionId) return;
    const definition = findDefinition(this.catalog, this.openDefinitionId)?.definition;
    if (!definition || definition.root.uuid === nodeUuid) return;
    this.commitCatalog(patchNodeName(this.catalog, this.openDefinitionId, nodeUuid, name));
  }

  patchDefinitionName(name: string) {
    if (!this.openDefinitionId) return;
    const located = findDefinition(this.catalog, this.openDefinitionId);
    if (!located) return;
    this.commitCatalog(
      patchCatalogDefinitionRecord(this.catalog, located.kind, this.openDefinitionId, { name }),
    );
  }

  patchDefinitionPreviewField(
    definitionUuid: string,
    field: string,
    value: import('@facadeur/domain').FieldValue | undefined,
  ) {
    this.updateDefinitionPreviewField(definitionUuid, field, value, false);
  }

  private updateDefinitionPreviewField(
    definitionUuid: string,
    field: string,
    value: import('@facadeur/domain').FieldValue | undefined,
    emptyStringRemoves: boolean,
  ) {
    const located = findDefinition(this.catalog, definitionUuid);
    if (!located) return;
    if (located.definition.config?.staticFields?.[field]?.isStatic) return;
    if (
      Object.values(located.definition.config?.instanceFieldConfigs ?? {}).some(
        (fields) => fields[field]?.isStatic,
      )
    ) {
      return;
    }
    this.commitCatalog(
      patchCatalogDefinitionPreviewField(
        this.catalog,
        definitionUuid,
        field,
        value,
        emptyStringRemoves,
      ),
    );
  }

  applyInspectorFormChange(target: InspectorFormChangeTarget) {
    switch (target.kind) {
      case 'definitionName': {
        if (!target.value) return;
        this.patchDefinitionName(target.value);
        return;
      }
      case 'definitionStaticField': {
        this.patchStaticField(target.field, target.setting, target.value);
        return;
      }
      case 'definitionInstanceField': {
        this.patchInstanceStaticField(
          target.instanceUuid,
          target.field,
          target.setting,
          target.value,
        );
        return;
      }
      case 'nodeTagName': {
        if (!target.value) return;
        this.patchNodeTagName(target.nodeUuid, target.value);
        return;
      }
      case 'nodeText': {
        this.patchNodeDomText(target.nodeUuid, target.value);
        return;
      }
      case 'nodeClassList': {
        this.patchNodeClassList(target.nodeUuid, target.value);
        return;
      }
      case 'nodeDataRecord': {
        const record: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(target.value)) {
          if (key.trim()) record[key.trim()] = value;
        }
        this.patchNodeDataRecord(target.nodeUuid, record);
        return;
      }
      case 'nodeComposition': {
        this.patchNodeComposition(target.nodeUuid, target.patch);
        return;
      }
      case 'nodeFieldExposureMode': {
        const definition = this.getSnapshot().openDefinition;
        const node = definition ? findNodeByUuid(definition.root, target.nodeUuid) : null;
        if (!node?.config?.definitionRef) return;
        const current = definition?.config?.fieldExposure?.[target.nodeUuid];
        let exposure: FieldExposure;
        if (target.mode === 'grouped') {
          const targetName = findDefinition(this.catalog, node.config.definitionRef)?.definition
            .name;
          exposure = {
            mode: 'grouped',
            groupName:
              current?.mode === 'grouped' ? current.groupName : node.name || targetName || 'group',
          };
        } else if (target.mode === 'manual') {
          exposure = {
            mode: 'manual',
            fields: current?.mode === 'manual' ? current.fields : {},
          };
        } else {
          exposure = { mode: 'flat' };
        }
        this.patchNodeExposure(target.nodeUuid, exposure);
        return;
      }
      case 'nodeFieldExposureGroupName': {
        const definition = this.getSnapshot().openDefinition;
        const node = definition ? findNodeByUuid(definition.root, target.nodeUuid) : null;
        if (!node?.config?.definitionRef) return;
        this.patchNodeExposure(target.nodeUuid, {
          mode: 'grouped',
          ...(target.value ? { groupName: target.value } : {}),
        });
        return;
      }
      case 'nodeFieldExposureFields': {
        const definition = this.getSnapshot().openDefinition;
        const node = definition ? findNodeByUuid(definition.root, target.nodeUuid) : null;
        if (!node?.config?.definitionRef) return;
        const fields: Record<string, string> = {};
        for (const [childField, parentField] of Object.entries(target.value)) {
          if (childField.trim() && parentField.trim())
            fields[childField.trim()] = parentField.trim();
        }
        this.patchNodeExposure(target.nodeUuid, { mode: 'manual', fields });
        return;
      }
      case 'previewField': {
        this.updateDefinitionPreviewField(target.definitionUuid, target.field, target.value, true);
        return;
      }
      case 'nodeSchemaField': {
        this.selectedNodeUuid = target.nodeUuid;
        this.patchNodeField(target.field, target.value ?? '');
        return;
      }
      default:
        return;
    }
  }

  insertCatalogNode(parentUuid: string, index: number, node: import('@facadeur/domain').Node) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(
      insertCatalogNode(this.catalog, this.openDefinitionId, parentUuid, index, node),
      () => {
        this.selectedNodeUuid = node.uuid;
      },
    );
  }

  duplicateCatalogNode(
    sourceDefinitionUuid: string,
    sourceNodeUuid: string,
    parentUuid: string,
    index: number,
  ) {
    if (!this.openDefinitionId) return null;
    const result = duplicateCatalogNode(
      this.catalog,
      sourceDefinitionUuid,
      sourceNodeUuid,
      this.openDefinitionId,
      parentUuid,
      index,
    );
    if (!result) return null;
    this.commitCatalog(result.catalog, () => {
      this.selectedNodeUuid = result.nodeUuid;
    });
    return result.nodeUuid;
  }

  removeCatalogNode(nodeUuid: string) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(removeCatalogNode(this.catalog, this.openDefinitionId, nodeUuid), () => {
      if (this.selectedNodeUuid === nodeUuid) {
        this.selectedNodeUuid = this.getSnapshot().openDefinition?.root.uuid ?? null;
      }
    });
  }

  moveCatalogNode(nodeUuid: string, parentUuid: string, index: number) {
    if (!this.openDefinitionId) return;
    this.commitCatalog(
      moveCatalogNode(this.catalog, this.openDefinitionId, nodeUuid, parentUuid, index),
      () => {
        this.selectedNodeUuid = nodeUuid;
      },
    );
  }

  selectNode(uuid: string) {
    if (!this.getSnapshot().openDefinition) return;
    this.selectedNodeUuid = uuid;
    this.publish();
  }

  async persist(port: CatalogPort) {
    this.commitCatalog(await port.save(this.catalog));
  }

  async createDefinitionFromPort(
    port: CatalogDefinitionPort,
    kind: CatalogMapKey,
    definition: Omit<NodeDefinition, 'uuid'> & { uuid?: string },
  ) {
    this.replaceCatalog(await port.createDefinition(kind, definition));
    return (
      definition.uuid ??
      Object.values(this.catalog[kind]).find((entry) => entry.name === definition.name)?.uuid
    );
  }

  async deleteDefinitionFromPort(port: CatalogDefinitionPort, uuid: string) {
    const kind = findDefinition(this.catalog, uuid)?.kind;
    if (!kind) throw new Error(`Unknown catalog definition "${uuid}"`);
    this.replaceCatalog(await port.deleteDefinition(kind, uuid));
  }

  private publish() {
    for (const listener of this.listeners) listener();
  }

  private commitCatalog(catalog: unknown, updateState?: () => void) {
    this.catalog = validateProjectCatalog(catalog) as ProjectCatalog;
    updateState?.();
    this.publish();
  }
}
