import type { CoreController, NodeDefinitionModel, ProjectCatalogModel } from '@facadeur/core';
import type { DesignPropDefinition } from '@facadeur/domain';
import { catalogKindForDefinition, createCatalogUuid } from '@facadeur/core';
import type { FieldValue, JsonSchemaObject } from '@facadeur/domain';
import type { EditorSession } from '../domain/session/types';
import type { CatalogDefinitionKind, EditorCatalogPort } from '../domain/project/catalog-port';

/** Editor entry: catalog editing via {@link CoreController}, chrome via {@link EditorSession}. */
export class AppService {
  readonly core: CoreController;
  readonly session: EditorSession;
  private readonly catalogPort: EditorCatalogPort;

  constructor(options: {
    core: CoreController;
    session: EditorSession;
    catalogPort: EditorCatalogPort;
  }) {
    this.core = options.core;
    this.session = options.session;
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

  get design() {
    return this.getSnapshot().design;
  }

  listAssets() {
    return this.getSnapshot().catalog;
  }

  async persistCatalog(catalog?: ProjectCatalogModel) {
    if (catalog) this.core.replaceCatalog(catalog);
    this.core.replaceCatalog(await this.catalogPort.save(this.core.getSnapshot().catalog));
  }

  async createDefinition(
    kind: CatalogDefinitionKind,
    definition: Omit<NodeDefinitionModel, 'uuid'> & { uuid?: string },
  ) {
    const catalog = await this.catalogPort.createDefinition(kind, definition);
    this.core.replaceCatalog(catalog);
    const uuid =
      definition.uuid ??
      Object.values(catalog[kind]).find((entry) => entry.name === definition.name)?.uuid;
    if (uuid) this.session.openAsset(uuid);
  }

  async patchDefinition(uuid: string, patch: Partial<NodeDefinitionModel>) {
    const kind = catalogKindForDefinition(this.core.getSnapshot().catalog, uuid);
    if (!kind) throw new Error(`Unknown catalog definition "${uuid}"`);
    this.core.patchDefinition(kind, uuid, patch);
  }

  async deleteDefinition(uuid: string) {
    const kind = catalogKindForDefinition(this.core.getSnapshot().catalog, uuid);
    if (!kind) throw new Error(`Unknown catalog definition "${uuid}"`);
    this.core.replaceCatalog(await this.catalogPort.deleteDefinition(kind, uuid));
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
    const fields = { ...(definition.config?.previewData?.fields ?? {}) } as Record<
      string,
      FieldValue
    >;
    if (value === undefined) delete fields[field];
    else fields[field] = value;
    await this.patchDefinition(definition.uuid, {
      config: {
        ...definition.config,
        previewData: { fields },
      },
    });
  }
}

export function createAppService(options: {
  core: CoreController;
  session: EditorSession;
  catalogPort: EditorCatalogPort;
}) {
  return new AppService(options);
}
