import type { CoreController, NodeDefinitionModel } from '@facadeur/core';
import type { DesignPropDefinition, FieldValue, JsonSchemaObject, Node } from '@facadeur/domain';
import { createCatalogUuid } from '@facadeur/core';
import type { EditorSession } from '../domain/session/types';
import type { CatalogDefinitionKind, EditorCatalogPort } from '../domain/project/catalog-port';
import { InspectorService } from './inspector';

/** Editor entry: catalog editing via {@link CoreController}, chrome via {@link EditorSession}. */
export class AppService {
  private readonly core: CoreController;
  readonly session: EditorSession;
  readonly inspector: InspectorService;
  private readonly catalogPort: EditorCatalogPort;

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
    return this.session.getSnapshot();
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

  async persistCatalog() {
    await this.core.persist(this.catalogPort);
  }

  async createDefinition(
    kind: CatalogDefinitionKind,
    definition: Omit<NodeDefinitionModel, 'uuid'> & { uuid?: string },
  ) {
    const uuid = await this.core.createDefinitionFromPort(this.catalogPort, kind, definition);
    if (uuid) this.session.openAsset(uuid);
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
