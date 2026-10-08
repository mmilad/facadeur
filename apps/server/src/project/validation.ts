import {
  ID_PATTERN,
  isJsonValue,
  isPlainObject,
  readTokenTree,
  resolveComponentContract,
  resolveChildFieldDefinition,
  validateCatalog,
  type Command,
  type CommandContext,
  type DocumentFile,
  type FieldDefinition,
  type JsonSchema,
  type SchemaCatalog,
} from '@facadeur/core';
import { loadTokens } from '@facadeur/tokens';
import { invalid, ProjectError } from './persistence';

export function safeId(id: string): void {
  if (
    typeof id !== 'string' ||
    !ID_PATTERN.test(id) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(id)
  ) {
    throw new ProjectError(400, 'Invalid document id');
  }
}

export function validate(files: DocumentFile[], fallbackSchemaCatalog?: SchemaCatalog): void {
  invalid(() => {
    const schemaCatalog = schemaCatalogFor(files, fallbackSchemaCatalog);
    const canonicalCatalog = files.some((file) => file.schemaCatalog !== undefined);
    const validationFiles =
      !canonicalCatalog && fallbackSchemaCatalog && schemaCatalog
        ? withoutLegacyExposeCollisions(files, schemaCatalog)
        : files;
    validateCatalog(validationFiles, schemaCatalog ? { schemaCatalog } : undefined);
    for (const file of files) {
      safeId(file.id);
      loadTokens({
        tokens: file.tokens,
        fonts: file.fonts,
        breakpoints: file.settings?.breakpoints,
      });
    }
  });
}

function withoutLegacyExposeCollisions(
  files: readonly DocumentFile[],
  schemaCatalog: SchemaCatalog,
): DocumentFile[] {
  const documents = new Map(files.map((file) => [file.id, file]));
  const resolverContext = { documents, schemaCatalog };
  return files.map((document) => {
    if (!document.schemaUse || !document.expose?.fields) return document;
    const directFields = resolveComponentContract(
      {
        ...document,
        expose: undefined,
        root: { id: document.root.id, type: 'frame', children: [] },
      },
      resolverContext,
    );
    const fields = Object.fromEntries(
      Object.entries(document.expose.fields).filter(([name]) => !directFields.has(name)),
    );
    if (Object.keys(fields).length === Object.keys(document.expose.fields).length) return document;
    const expose = {
      ...document.expose,
      ...(Object.keys(fields).length ? { fields } : {}),
    };
    if (!Object.keys(fields).length) delete expose.fields;
    return {
      ...document,
      ...(Object.keys(expose.fields ?? {}).length || Object.keys(expose.events ?? {}).length
        ? { expose }
        : { expose: undefined }),
    };
  });
}

export function context(
  files: DocumentFile[],
  designId: string,
  fallbackSchemaCatalog?: SchemaCatalog,
): CommandContext {
  const catalog = new Map(files.map((file) => [file.id, file]));
  const design = catalog.get(designId);
  const schemaCatalog = schemaCatalogFor(files, fallbackSchemaCatalog);
  return {
    schemaResolverContext: { documents: catalog, schemaCatalog },
    resolveKind: (id) => catalog.get(id)?.kind,
    resolveChildField: (node, path, field) =>
      resolveChildFieldDefinition(node, path, field, catalog, schemaCatalog),
    globalTokenPaths: new Set(readTokenTree(design?.tokens ?? {}).tokens.keys()),
    resolveComponentTokenPaths: (id) => {
      const tokens = catalog.get(id)?.componentTokens;
      return tokens ? new Set(Object.values(tokens).map((token) => token.path)) : undefined;
    },
  };
}

function schemaCatalogFor(
  files: readonly DocumentFile[],
  fallback: SchemaCatalog | undefined,
): SchemaCatalog | undefined {
  const canonical = files.find((file) => file.schemaCatalog)?.schemaCatalog;
  if (canonical || !fallback) return canonical ?? fallback;

  const missingProperties = new Map<string, Map<string, JsonSchema>>();
  const requiredProperties = new Map<string, Set<string>>();
  const legacyUnionSchemas = new Set<string>();
  for (const document of files) {
    const direct = document.schemaUse?.direct;
    if (direct?.kind !== 'schema' || !document.fields?.length) continue;
    const target = fallback.schemas.find((schema) => schema.id === direct.schemaId);
    if (!target) continue;
    if (target.schema.oneOf?.length || target.schema.anyOf?.length) {
      legacyUnionSchemas.add(target.id);
    }
    let properties = missingProperties.get(target.id);
    if (!properties) missingProperties.set(target.id, (properties = new Map()));
    let required = requiredProperties.get(target.id);
    if (!required) requiredProperties.set(target.id, (required = new Set()));
    const existingNames = new Set(Object.keys(target.schema.properties ?? {}));
    for (const field of document.fields) {
      if (existingNames.has(field.name) || properties.has(field.name)) continue;
      properties.set(field.name, schemaForLegacyField(field));
      if (field.required) required.add(field.name);
    }
  }
  if (!missingProperties.size && !legacyUnionSchemas.size) return fallback;
  return {
    schemas: fallback.schemas.map((schema) => {
      const additions = missingProperties.get(schema.id);
      const projectLegacyUnion = legacyUnionSchemas.has(schema.id);
      if (!additions?.size && !projectLegacyUnion) return schema;
      const required = requiredProperties.get(schema.id);
      const schemaShape = { ...schema.schema };
      if (projectLegacyUnion) {
        // The legacy fallback is only used to keep old local FieldDefinition
        // contracts readable. Core correctly rejects flattening canonical unions.
        delete schemaShape.oneOf;
        delete schemaShape.anyOf;
      }
      return {
        ...schema,
        schema: {
          ...schemaShape,
          ...(projectLegacyUnion && !schemaShape.type ? { type: 'object' } : {}),
          properties: {
            ...(schemaShape.properties ?? {}),
            ...Object.fromEntries(additions ?? []),
          },
          ...(required?.size
            ? { required: [...new Set([...(schema.schema.required ?? []), ...required])] }
            : {}),
        },
      };
    }),
  };
}

function schemaForLegacyField(field: FieldDefinition): JsonSchema {
  const schema: JsonSchema = { 'x-facadeur-type': field.type };
  if (field.default !== undefined) schema.default = field.default;
  if (field.type === 'enum' && field.options) schema.enum = [...field.options];
  if (field.items) {
    schema.items = { 'x-facadeur-type': field.items.type };
    if (field.items.options) schema.items.enum = [...field.items.options];
    if (field.items.fields) {
      schema.items.properties = Object.fromEntries(
        field.items.fields.map((item) => [item.name, schemaForLegacyField(item)]),
      );
      const required = field.items.fields.filter((item) => item.required).map((item) => item.name);
      if (required.length) schema.items.required = required;
    }
  }
  return schema;
}

// Required fields are checked before pure core command validation, including commands
// whose absent payload would otherwise be interpreted as a reset/no-op.
const required: Record<Command['type'], readonly string[]> = {
  batch: ['commands'],
  setDocumentMetadata: ['name', 'slug'],
  setDocumentGroup: ['group'],
  insert: ['parentId', 'node'],
  remove: ['nodeId'],
  move: ['nodeId', 'parentId', 'index'],
  wrap: ['nodeId'],
  setProp: ['nodeId', 'prop', 'value'],
  setStyle: ['nodeId', 'property', 'value'],
  setField: ['nodeId', 'field', 'value'],
  setChildField: ['nodeId', 'path', 'field', 'value'],
  setVariant: ['nodeId', 'axis', 'value'],
  defineField: ['field'],
  setPreviewData: ['previewData'],
  setVariantLabels: ['labels'],
  removeField: ['name'],
  defineEvent: ['event'],
  removeEvent: ['name'],
  setExpose: ['expose'],
  defineVariant: ['axis'],
  removeVariant: ['name'],
  setVariantPreset: ['preset'],
  createVariantPreset: ['name', 'label'],
  setVariantStyleBlock: ['name', 'style'],
  removeVariantPreset: ['name'],
  setToken: ['path', 'token'],
  removeToken: ['path'],
  setTokenGroup: ['path', 'group'],
  removeTokenGroup: ['path'],
  setFont: ['font'],
  removeFont: ['id'],
  setBreakpoints: ['breakpoints'],
  setStyleBlock: ['style'],
  setTokenInterface: ['tokenInterface'],
  setComponentToken: ['id', 'path', 'token'],
  removeComponentToken: ['id'],
  renameComponentTokenPath: ['id', 'path'],
  setSchemaCatalog: ['schemaCatalog'],
  setSchemaUse: ['schemaUse'],
};

export function assertCommand(command: Command): void {
  assertNestedCommand(command, 0);
}

function assertNestedCommand(value: unknown, depth: number): void {
  if (
    !isPlainObject(value) ||
    !isJsonValue(value) ||
    typeof value.type !== 'string' ||
    !Object.hasOwn(required, value.type)
  ) {
    throw new ProjectError(400, 'Invalid command');
  }
  const command = value as Command;
  for (const key of required[command.type]) {
    if (!Object.hasOwn(command, key)) throw new ProjectError(400, `Command requires ${key}`);
  }
  if (command.type === 'batch') {
    if (depth >= 8 || !Array.isArray(command.commands) || command.commands.length > 100) {
      throw new ProjectError(
        400,
        'Batch commands must be an array of at most 100 commands, nested at most 8 levels',
      );
    }
    for (const item of command.commands) assertNestedCommand(item, depth + 1);
  }
  for (const key of [
    'nodeId',
    'parentId',
    'name',
    'path',
    'prop',
    'property',
    'id',
    'label',
    'slug',
  ]) {
    if (
      Object.hasOwn(command, key) &&
      typeof (command as unknown as Record<string, unknown>)[key] !== 'string'
    ) {
      throw new ProjectError(400, `Command ${key} must be a string`);
    }
  }
  if ('index' in command && (!Number.isSafeInteger(command.index) || Number(command.index) < 0)) {
    throw new ProjectError(400, 'Command index must be a nonnegative integer');
  }
}
