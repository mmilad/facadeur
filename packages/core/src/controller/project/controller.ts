import type {
  CatalogMapKey,
  CatalogPort,
  CoreSnapshot,
  JsonSchemaObject,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';
import { DocumentError } from '../../document/errors';
import type { CoreControllerHost } from '../../types/host';
import { applyCatalogDesignCommand, type CatalogDesignCommand } from './catalog/design-commands';
import {
  createCatalogDefinition,
  deleteCatalogDefinitionRecord,
  patchCatalogDefinitionRecord,
  removeCatalogSchema,
  upsertCatalogSchema,
} from './catalog/definition-ops';
import { removeCatalogDesignProp, upsertCatalogDesignProp } from './catalog/props-ops';
import {
  findDefinition,
  findNodeByUuid,
  patchNodeData,
  patchNodeDataRecord,
  patchNodeName,
  patchNodeDomAttributes,
  patchNodeStyleRecord,
  patchNodeTagName,
} from './catalog/ops';
import { insertCatalogNode, moveCatalogNode, removeCatalogNode } from './catalog/tree-ops';
import type { InspectorFormChangeTarget } from './node/preview/inspector-view';
import { emptyProjectCatalog, validateProjectCatalog } from './catalog/validate';
import { NodeController } from './node/controller';

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
    this.catalog = validateProjectCatalog(
      createCatalogDefinition(this.catalog, kind, definition),
    ) as ProjectCatalog;
    this.publish();
  }

  patchDefinition(kind: CatalogMapKey, uuid: string, patch: Partial<NodeDefinition>) {
    this.catalog = validateProjectCatalog(
      patchCatalogDefinitionRecord(this.catalog, kind, uuid, patch),
    ) as ProjectCatalog;
    if (this.openDefinitionId === uuid) {
      const located = findDefinition(this.catalog, uuid);
      if (located) this.selectedNodeUuid = located.definition.root.uuid;
    }
    this.publish();
  }

  deleteDefinition(kind: CatalogMapKey, uuid: string) {
    this.catalog = validateProjectCatalog(
      deleteCatalogDefinitionRecord(this.catalog, kind, uuid),
    ) as ProjectCatalog;
    if (this.openDefinitionId === uuid) {
      this.openDefinitionId = null;
      this.selectedNodeUuid = null;
    }
    this.publish();
  }

  upsertSchema(uuid: string, schema: JsonSchemaObject) {
    this.catalog = validateProjectCatalog(
      upsertCatalogSchema(this.catalog, uuid, schema),
    ) as ProjectCatalog;
    this.publish();
  }

  removeSchema(uuid: string) {
    this.catalog = validateProjectCatalog(
      removeCatalogSchema(this.catalog, uuid),
    ) as ProjectCatalog;
    this.publish();
  }

  upsertDesignProp(prop: import('@facadeur/domain').DesignPropDefinition) {
    this.catalog = validateProjectCatalog(
      upsertCatalogDesignProp(this.catalog, prop),
    ) as ProjectCatalog;
    this.publish();
  }

  removeDesignProp(uuid: string) {
    this.catalog = validateProjectCatalog(
      removeCatalogDesignProp(this.catalog, uuid),
    ) as ProjectCatalog;
    this.publish();
  }

  patchNodeField(field: string, value: unknown) {
    if (!this.openDefinitionId || !this.selectedNodeUuid) return;
    this.catalog = validateProjectCatalog(
      patchNodeData(this.catalog, this.openDefinitionId, this.selectedNodeUuid, field, value),
    ) as ProjectCatalog;
    this.publish();
  }

  patchNodeDataRecord(nodeUuid: string, record: Readonly<Record<string, unknown>>) {
    if (!this.openDefinitionId) return;
    this.catalog = validateProjectCatalog(
      patchNodeDataRecord(this.catalog, this.openDefinitionId, nodeUuid, record),
    ) as ProjectCatalog;
    this.publish();
  }

  patchNodeStyleRecord(nodeUuid: string, record: Readonly<Record<string, string>>) {
    if (!this.openDefinitionId) return;
    this.catalog = validateProjectCatalog(
      patchNodeStyleRecord(this.catalog, this.openDefinitionId, nodeUuid, record),
    ) as ProjectCatalog;
    this.publish();
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
    this.catalog = validateProjectCatalog(
      patchNodeDomAttributes(this.catalog, this.openDefinitionId, nodeUuid, patch),
    ) as ProjectCatalog;
    this.publish();
  }

  patchNodeClassList(nodeUuid: string, classes: readonly string[]) {
    if (!this.openDefinitionId) return;
    const value = classes.join(' ').trim();
    this.catalog = validateProjectCatalog(
      patchNodeDomAttributes(this.catalog, this.openDefinitionId, nodeUuid, {
        class: value,
      }),
    ) as ProjectCatalog;
    this.publish();
  }

  patchNodeTagName(nodeUuid: string, tagName: string) {
    if (!this.openDefinitionId) return;
    this.catalog = validateProjectCatalog(
      patchNodeTagName(this.catalog, this.openDefinitionId, nodeUuid, tagName),
    ) as ProjectCatalog;
    this.publish();
  }

  patchNodeName(nodeUuid: string, name: string) {
    if (!this.openDefinitionId) return;
    const definition = findDefinition(this.catalog, this.openDefinitionId)?.definition;
    if (!definition || definition.root.uuid === nodeUuid) return;
    this.catalog = validateProjectCatalog(
      patchNodeName(this.catalog, this.openDefinitionId, nodeUuid, name),
    ) as ProjectCatalog;
    this.publish();
  }

  patchDefinitionName(name: string) {
    if (!this.openDefinitionId) return;
    const located = findDefinition(this.catalog, this.openDefinitionId);
    if (!located) return;
    this.catalog = validateProjectCatalog(
      patchCatalogDefinitionRecord(this.catalog, located.kind, this.openDefinitionId, { name }),
    ) as ProjectCatalog;
    this.publish();
  }

  patchDefinitionPreviewFields(fields: Readonly<Record<string, unknown>>) {
    if (!this.openDefinitionId) return;
    const located = findDefinition(this.catalog, this.openDefinitionId);
    if (!located) return;
    const definition = located.definition;
    this.catalog = validateProjectCatalog(
      patchCatalogDefinitionRecord(this.catalog, located.kind, this.openDefinitionId, {
        config: {
          ...definition.config,
          previewData: { fields: fields as Record<string, import('@facadeur/domain').FieldValue> },
        },
      }),
    ) as ProjectCatalog;
    this.publish();
  }

  applyInspectorFormChange(target: InspectorFormChangeTarget) {
    switch (target.kind) {
      case 'definitionName': {
        if (!target.value) return;
        this.patchDefinitionName(target.value);
        return;
      }
      case 'nodeTagName': {
        if (!target.value) return;
        this.patchNodeTagName(target.nodeUuid, target.value);
        return;
      }
      case 'nodeClassList': {
        this.patchNodeClassList(target.nodeUuid, target.value);
        return;
      }
      case 'nodeStyle': {
        this.patchNodeStyleRecord(target.nodeUuid, target.value);
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
      case 'previewField': {
        if (!this.openDefinitionId) return;
        const located = findDefinition(this.catalog, this.openDefinitionId);
        if (!located) return;
        const fields = {
          ...(located.definition.config?.previewData?.fields ?? {}),
        } as Record<string, import('@facadeur/domain').FieldValue>;
        if (target.value === undefined || target.value === '') delete fields[target.field];
        else fields[target.field] = target.value;
        this.patchDefinitionPreviewFields(fields);
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
    this.catalog = validateProjectCatalog(
      insertCatalogNode(this.catalog, this.openDefinitionId, parentUuid, index, node),
    ) as ProjectCatalog;
    this.selectedNodeUuid = node.uuid;
    this.publish();
  }

  removeCatalogNode(nodeUuid: string) {
    if (!this.openDefinitionId) return;
    this.catalog = validateProjectCatalog(
      removeCatalogNode(this.catalog, this.openDefinitionId, nodeUuid),
    ) as ProjectCatalog;
    if (this.selectedNodeUuid === nodeUuid) {
      this.selectedNodeUuid = this.getSnapshot().openDefinition?.root.uuid ?? null;
    }
    this.publish();
  }

  moveCatalogNode(nodeUuid: string, parentUuid: string, index: number) {
    if (!this.openDefinitionId) return;
    this.catalog = validateProjectCatalog(
      moveCatalogNode(this.catalog, this.openDefinitionId, nodeUuid, parentUuid, index),
    ) as ProjectCatalog;
    this.selectedNodeUuid = nodeUuid;
    this.publish();
  }

  selectNode(uuid: string) {
    if (!this.getSnapshot().openDefinition) return;
    this.selectedNodeUuid = uuid;
    this.publish();
  }

  async persist(port: CatalogPort) {
    this.catalog = validateProjectCatalog(await port.save(this.catalog)) as ProjectCatalog;
    this.publish();
  }

  async reload(port: CatalogPort) {
    this.replaceCatalog(await port.load());
  }

  private publish() {
    for (const listener of this.listeners) listener();
  }
}
