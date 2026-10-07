import { DocumentError } from '../../../document/errors.js';
import { isPlainObject, isJsonValue } from '../../../utils.js';
import {
  basicSchemaTypes,
  type ComponentSchemaUse,
  type SchemaCatalog,
} from '../../../schema/document.js';
import type { FlatDocument } from '../../../document/flat.js';

export function setSchemaCatalog(doc: FlatDocument, value: SchemaCatalog | null) {
  if (value === null) {
    delete doc.schemaCatalog;
    return;
  }
  assertSchemaCatalog(value);
  doc.schemaCatalog = structuredClone(value);
}

export function setSchemaUse(doc: FlatDocument, value: ComponentSchemaUse | null) {
  if (value === null) {
    delete doc.schemaUse;
    return;
  }
  const normalized = normalizeSchemaUse(value);
  if (!isJsonValue(normalized) || !isPlainObject(normalized)) {
    throw new DocumentError('schema', 'Component schema use must be a JSON object');
  }
  assertSchemaUse(normalized);
  doc.schemaUse = structuredClone(normalized) as ComponentSchemaUse;
}

function normalizeSchemaUse(value: ComponentSchemaUse): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  if (value.direct !== undefined) next.direct = value.direct;
  if (value.fields !== undefined) next.fields = value.fields;
  if (value.defaults !== undefined) next.defaults = value.defaults;
  return next;
}

function assertSchemaCatalog(value: SchemaCatalog) {
  if (!isJsonValue(value) || !isPlainObject(value) || !Array.isArray(value.schemas)) {
    throw new DocumentError('schema', 'Schema catalog must contain a schemas array');
  }
  const ids = new Set<string>();
  for (const entry of value.schemas) {
    if (
      !isPlainObject(entry) ||
      typeof entry.id !== 'string' ||
      !entry.id.length ||
      typeof entry.name !== 'string' ||
      !entry.name.trim() ||
      !isPlainObject(entry.schema)
    ) {
      throw new DocumentError('schema', 'Named schemas need an id, name, and schema object');
    }
    if (Object.keys(entry).some((key) => !['id', 'name', 'description', 'schema'].includes(key))) {
      throw new DocumentError('schema', 'Named schemas contain an unsupported property');
    }
    if (entry.description !== undefined && typeof entry.description !== 'string') {
      throw new DocumentError('schema', 'Named schema descriptions must be strings');
    }
    if (ids.has(entry.id)) {
      throw new DocumentError('schema', `Duplicate schema id "${entry.id}"`);
    }
    ids.add(entry.id);
  }
}

function assertSchemaUse(value: Record<string, unknown>) {
  const keys = Object.keys(value);
  if (keys.some((key) => !['direct', 'fields', 'defaults'].includes(key))) {
    throw new DocumentError('schema', 'Component schema use contains an unsupported property');
  }
  if (!keys.length) throw new DocumentError('schema', 'Component schema use cannot be empty');
  if (value.direct !== undefined && !isSchemaTypeRef(value.direct)) {
    throw new DocumentError('schema', 'Component schema use has an invalid direct type reference');
  }
  if (
    value.fields !== undefined &&
    (!Array.isArray(value.fields) || !value.fields.every(isSchemaFieldUse))
  ) {
    throw new DocumentError('schema', 'Component schema use has invalid field references');
  }
  if (value.defaults !== undefined && !isPlainObject(value.defaults)) {
    throw new DocumentError('schema', 'Schema-use defaults must be an object of sample values');
  }
}

function isSchemaFieldUse(value: unknown) {
  return (
    isPlainObject(value) &&
    Object.keys(value).every((key) => key === 'name' || key === 'type') &&
    typeof value.name === 'string' &&
    /^[A-Za-z][A-Za-z0-9_-]*$/.test(value.name) &&
    isSchemaTypeRef(value.type)
  );
}

function isSchemaTypeRef(value: unknown) {
  if (!isPlainObject(value)) return false;
  if (value.kind === 'type') {
    return (
      Object.keys(value).every((key) => key === 'kind' || key === 'type') &&
      typeof value.type === 'string' &&
      basicSchemaTypes.includes(value.type as (typeof basicSchemaTypes)[number])
    );
  }
  return (
    value.kind === 'schema' &&
    Object.keys(value).every((key) => key === 'kind' || key === 'schemaId') &&
    typeof value.schemaId === 'string' &&
    value.schemaId.length > 0
  );
}
