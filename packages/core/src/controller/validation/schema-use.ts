import type {
  EventBinding,
  EventDefinition,
  FieldDefinition,
  FieldType,
  JsonSchema,
  SchemaCatalog,
  SchemaTypeRef,
} from '../../schema/document';
import type { ContractDocument } from './types';

const SCHEMA_REF_PREFIX = 'facadeur://schema/';
const FIELD_TYPES = new Set<FieldType>([
  'text',
  'richText',
  'image',
  'link',
  'boolean',
  'enum',
  'number',
  'token',
  'array',
  'object',
]);

/** Resolve an event's declared data contract, including legacy payload declarations. */
export function eventDataSchema(
  event: EventDefinition,
  catalog?: SchemaCatalog,
): JsonSchema | undefined {
  if (event.data?.direct) {
    if (event.data.direct.kind === 'type') return { type: event.data.direct.type };
    return resolveNamedSchema(event.data.direct.schemaId, catalog, new Set());
  }
  if (event.data?.fields) {
    const properties: Record<string, JsonSchema> = {};
    for (const field of event.data.fields) {
      const schema = schemaForTypeRef(field.type, catalog);
      if (schema) properties[field.name] = schema;
    }
    const required = event.data.fields.map(({ name }) => name);
    return { type: 'object', properties, required, additionalProperties: false };
  }
  if (event.payload) {
    const properties = Object.fromEntries(
      Object.entries(event.payload).map(([name, type]) => [name, legacyFieldSchema(type)]),
    );
    return {
      type: 'object',
      properties,
      required: Object.keys(event.payload),
      additionalProperties: false,
    };
  }
  return undefined;
}

/** Normalize legacy event payload bindings at the shared read boundary. */
export function eventDataMappings(
  event: EventDefinition,
  binding: EventBinding,
): EventBinding['data'] {
  if (binding.data) return binding.data;
  if (!event.payload) return undefined;
  return Object.entries(event.payload).map(([path, type]) => {
    const legacySource = binding.payload?.[path];
    const sourcePath =
      legacySource === 'checked' || (!legacySource && type === 'boolean')
        ? 'currentTarget.checked'
        : legacySource === 'valueAsNumber' || (!legacySource && type === 'number')
          ? 'currentTarget.valueAsNumber'
          : 'currentTarget.value';
    return { path, source: { kind: 'native' as const, path: sourcePath } };
  });
}

function schemaForTypeRef(ref: SchemaTypeRef, catalog?: SchemaCatalog): JsonSchema | undefined {
  return ref.kind === 'type'
    ? { type: ref.type }
    : resolveNamedSchema(ref.schemaId, catalog, new Set());
}

function legacyFieldSchema(type: FieldType): JsonSchema {
  if (type === 'number') return { type: 'number' };
  if (type === 'boolean') return { type: 'boolean' };
  if (type === 'array') return { type: 'array' };
  if (type === 'object') return { type: 'object' };
  return { type: 'string' };
}

/** Resolve the local schema-use contribution; legacy fields are read only when no use exists. */
export function localContractFieldsFor(
  document: ContractDocument,
  schemaCatalog: SchemaCatalog | undefined,
): Map<string, FieldDefinition> {
  const use = document.schemaUse;
  if (!use) return new Map((document.fields ?? []).map((field) => [field.name, field]));
  if (use.fields?.length) {
    const fields = new Map<string, FieldDefinition>();
    for (const entry of use.fields) {
      const definition = fieldForTypeRef(entry.name, entry.type, schemaCatalog);
      if (definition) fields.set(entry.name, definition);
    }
    return fields;
  }
  if (!use.direct) {
    return new Map((document.fields ?? []).map((field) => [field.name, field]));
  }
  if (use.direct.kind === 'type') {
    const field = definitionFromSchema('value', { type: use.direct.type }, schemaCatalog);
    return field ? new Map([[field.name, field]]) : new Map();
  }
  const schema = resolveNamedSchema(use.direct.schemaId, schemaCatalog, new Set());
  if (!schema) return new Map();
  const fields = new Map<string, FieldDefinition>();
  collectObjectFields(schema, schemaCatalog, new Set(), fields);
  if (
    !fields.size &&
    ((schemaType(schema) && schemaType(schema) !== 'object') || schema.oneOf || schema.anyOf)
  ) {
    const valueField = definitionFromSchema('value', schema, schemaCatalog);
    if (valueField) fields.set(valueField.name, valueField);
  }
  return fields;
}

function fieldForTypeRef(name: string, ref: SchemaTypeRef, catalog: SchemaCatalog | undefined) {
  if (ref.kind === 'type') return definitionFromSchema(name, { type: ref.type }, catalog);
  const schema = resolveNamedSchema(ref.schemaId, catalog, new Set());
  return schema ? definitionFromSchema(name, schema, catalog) : undefined;
}

function collectObjectFields(
  schema: JsonSchema,
  catalog: SchemaCatalog | undefined,
  ancestors: ReadonlySet<string>,
  fields: Map<string, FieldDefinition>,
): void {
  // A schema can declare a flat component contract in `properties` while using
  // oneOf/anyOf to constrain valid values. In that case the explicit properties
  // are authoritative; union branches must not be flattened into the contract.
  const refId = schema.$ref ? schemaIdFromRef(schema.$ref) : undefined;
  if (refId) {
    const referenced = resolveNamedSchema(refId, catalog, ancestors);
    if (referenced) collectObjectFields(referenced, catalog, new Set(ancestors).add(refId), fields);
  }
  for (const branch of schema.allOf ?? []) collectObjectFields(branch, catalog, ancestors, fields);
  const required = new Set(schema.required ?? []);
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    const definition = definitionFromSchema(name, property, catalog, required.has(name));
    if (!definition) continue;
    fields.delete(name);
    fields.set(name, definition);
  }
}

function definitionFromSchema(
  name: string,
  schema: JsonSchema,
  catalog: SchemaCatalog | undefined,
  required = false,
  ancestors: ReadonlySet<string> = new Set(),
): FieldDefinition | undefined {
  const resolved = resolveInlineSchema(schema, catalog, ancestors);
  const type = fieldTypeForSchema(resolved);
  if (!type) return undefined;
  const result: FieldDefinition = {
    name,
    type,
    schema: resolveSchemaMetadata(schema, catalog, ancestors),
  };
  if (required) result.required = true;
  if (isFieldValue(resolved.default)) result.default = resolved.default;
  const options = resolved.enum?.filter((value): value is string => typeof value === 'string');
  if (type === 'enum' && options?.length) result.options = [...options];
  if (type === 'array' && resolved.items) {
    const itemType = fieldTypeForSchema(resolveInlineSchema(resolved.items, catalog, ancestors));
    if (itemType)
      result.items = {
        type: itemType,
        schema: resolveSchemaMetadata(resolved.items, catalog, ancestors),
      };
  }
  if (type === 'object' && resolved.properties) {
    const childRequired = new Set(resolved.required ?? []);
    const childFields = Object.entries(resolved.properties).flatMap(([childName, child]) => {
      const field = definitionFromSchema(
        childName,
        child,
        catalog,
        childRequired.has(childName),
        ancestors,
      );
      return field ? [field] : [];
    });
    if (childFields.length) result.items = { type: 'object', fields: childFields };
  }
  return result;
}

function resolveInlineSchema(
  schema: JsonSchema,
  catalog: SchemaCatalog | undefined,
  ancestors: ReadonlySet<string>,
): JsonSchema {
  let result: JsonSchema = {};
  const refId = schema.$ref ? schemaIdFromRef(schema.$ref) : undefined;
  if (refId && !ancestors.has(refId)) {
    const referenced = resolveNamedSchema(refId, catalog, ancestors);
    if (referenced)
      result = resolveInlineSchema(referenced, catalog, new Set(ancestors).add(refId));
  }
  for (const branch of schema.allOf ?? []) {
    result = mergeSchema(result, resolveInlineSchema(branch, catalog, ancestors));
  }
  return mergeSchema(result, schema);
}

function resolveSchemaMetadata(
  schema: JsonSchema,
  catalog: SchemaCatalog | undefined,
  ancestors: ReadonlySet<string>,
): JsonSchema {
  const refId = schema.$ref ? schemaIdFromRef(schema.$ref) : undefined;
  if (refId && !ancestors.has(refId)) {
    const referenced = resolveNamedSchema(refId, catalog, ancestors);
    if (!referenced) return structuredClone(schema);
    return resolveSchemaMetadata(referenced, catalog, new Set(ancestors).add(refId));
  }
  const result = structuredClone(schema);
  delete result.$ref;
  for (const keyword of ['oneOf', 'anyOf', 'allOf'] as const) {
    if (schema[keyword]) {
      result[keyword] = schema[keyword]!.map((branch) =>
        resolveSchemaMetadata(branch, catalog, ancestors),
      );
    }
  }
  if (schema.properties) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([name, property]) => [
        name,
        resolveSchemaMetadata(property, catalog, ancestors),
      ]),
    );
  }
  if (schema.items) result.items = resolveSchemaMetadata(schema.items, catalog, ancestors);
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    result.additionalProperties = resolveSchemaMetadata(
      schema.additionalProperties,
      catalog,
      ancestors,
    );
  }
  return result;
}

function resolveNamedSchema(
  id: string,
  catalog: SchemaCatalog | undefined,
  ancestors: ReadonlySet<string>,
) {
  if (ancestors.has(id)) return undefined;
  const named = catalog?.schemas.find((entry) => entry.id === id);
  if (!named) return undefined;
  return resolveInlineSchema(named.schema, catalog, new Set(ancestors).add(id));
}

function mergeSchema(base: JsonSchema, extension: JsonSchema) {
  const result: JsonSchema = { ...base, ...extension };
  if (base.properties || extension.properties) {
    result.properties = { ...(base.properties ?? {}), ...(extension.properties ?? {}) };
  }
  if (base.required || extension.required) {
    result.required = [...new Set([...(base.required ?? []), ...(extension.required ?? [])])];
  }
  delete result.$ref;
  delete result.allOf;
  return result;
}

function fieldTypeForSchema(schema: JsonSchema) {
  const custom = schema['x-facadeur-type'];
  if (typeof custom === 'string' && FIELD_TYPES.has(custom as FieldType))
    return custom as FieldType;
  if (schema.enum?.every((value) => typeof value === 'string')) return 'enum';
  const type = schemaType(schema);
  if ((schema.oneOf?.length || schema.anyOf?.length) && !type) return 'object';
  if (type === 'string') return 'text';
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object' || schema.properties) return 'object';
  if (type === 'array' || schema.items) return 'array';
  return undefined;
}

function schemaType(schema: JsonSchema) {
  return Array.isArray(schema.type) ? schema.type.find((type) => type !== 'null') : schema.type;
}

function schemaIdFromRef(ref: string) {
  if (!ref.startsWith(SCHEMA_REF_PREFIX)) return undefined;
  try {
    const id = decodeURIComponent(ref.slice(SCHEMA_REF_PREFIX.length));
    return id.length && `${SCHEMA_REF_PREFIX}${encodeURIComponent(id)}` === ref ? id : undefined;
  } catch {
    return undefined;
  }
}

function isFieldValue(value: unknown): value is FieldDefinition['default'] {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) return value.every(isFieldValue);
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every(isFieldValue);
}
