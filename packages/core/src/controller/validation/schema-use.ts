import { DocumentError } from '../../document/errors.js';
import type {
  FieldDefinition,
  FieldType,
  JsonSchema,
  SchemaCatalog,
  SchemaTypeRef,
} from '../../document/schema.js';
import type { ContractDocument } from './types.js';

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
  if (!use.direct) return new Map();
  if (use.direct.kind === 'type') {
    const field = definitionFromSchema('value', { type: use.direct.type }, schemaCatalog);
    return field ? new Map([[field.name, field]]) : new Map();
  }
  const schema = resolveNamedSchema(use.direct.schemaId, schemaCatalog, new Set());
  if (!schema) return new Map();
  const fields = new Map<string, FieldDefinition>();
  collectObjectFields(schema, schemaCatalog, new Set(), fields);
  if (!fields.size && schemaType(schema) && schemaType(schema) !== 'object') {
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
  if ((schema.oneOf?.length || schema.anyOf?.length) && !schema.properties) {
    throw new DocumentError(
      'schema',
      'oneOf/anyOf schema contracts cannot be represented as flat component fields',
    );
  }
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
  const result: FieldDefinition = { name, type };
  if (required) result.required = true;
  if (isFieldValue(resolved.default)) result.default = resolved.default;
  const options = resolved.enum?.filter((value): value is string => typeof value === 'string');
  if (type === 'enum' && options?.length) result.options = [...options];
  if (type === 'array' && resolved.items) {
    const itemType = fieldTypeForSchema(resolveInlineSchema(resolved.items, catalog, ancestors));
    if (itemType) result.items = { type: itemType };
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
  if ((schema.oneOf?.length || schema.anyOf?.length) && !schema.properties) {
    throw new DocumentError(
      'schema',
      'oneOf/anyOf schema contracts cannot be represented as flat component fields',
    );
  }
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
