import { createId } from '@facadeur/core';
import { BUILTIN_SCHEMAS, DEFAULT_SCHEMA_ASSIGNMENTS } from './builtin-schemas.js';
import {
  type ComponentSchemaUse,
  isComponentSchemaUse,
  schemaUseFromAssignment,
} from './schema-use.js';

export interface JsonSchema {
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  default?: unknown;
}

export interface LibrarySchema {
  id: string;
  name: string;
  description?: string;
  schema: JsonSchema;
}

export type SchemaAssignment = string | ComponentSchemaUse;

export interface SchemaLibraryState {
  schemas: LibrarySchema[];
  assignments: Record<string, SchemaAssignment>;
}

interface PersistedLibrary {
  seeded: boolean;
  custom: LibrarySchema[];
  overrides: Record<string, LibrarySchema>;
  hidden: string[];
  assignments: Record<string, SchemaAssignment>;
}

const STORAGE_KEY = 'facadeur.schema-library.v1';

const EMPTY: SchemaLibraryState = { schemas: [], assignments: {} };

const BLANK_PERSISTED: PersistedLibrary = {
  seeded: false,
  custom: [],
  overrides: {},
  hidden: [],
  assignments: {},
};

let state: SchemaLibraryState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

export function emptyObjectSchema(): JsonSchema {
  return { type: 'object', properties: {} };
}

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

function isLibrarySchema(value: unknown): value is LibrarySchema {
  if (!value || typeof value !== 'object') return false;
  const schema = value as LibrarySchema;
  return (
    typeof schema.id === 'string' &&
    schema.id.length > 0 &&
    typeof schema.name === 'string' &&
    schema.name.length > 0 &&
    !!schema.schema &&
    typeof schema.schema === 'object' &&
    !Array.isArray(schema.schema)
  );
}

function parseAssignmentValue(value: unknown): SchemaAssignment | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (isComponentSchemaUse(value)) return value;
  return null;
}

function assignmentRecord(value: unknown): Record<string, SchemaAssignment> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, SchemaAssignment> = {};
  for (const [documentId, entry] of Object.entries(value)) {
    const parsed = parseAssignmentValue(entry);
    if (parsed !== null) result[documentId] = parsed;
  }
  return result;
}

function schemaIds(state: SchemaLibraryState): Set<string> {
  return new Set(state.schemas.map((schema) => schema.id));
}

function assignmentReferencesSchema(assignment: SchemaAssignment, schemaId: string): boolean {
  if (typeof assignment === 'string') return assignment === schemaId;
  if (assignment.direct?.kind === 'schema' && assignment.direct.schemaId === schemaId) return true;
  return (
    assignment.fields?.some(
      (field) => field.type.kind === 'schema' && field.type.schemaId === schemaId,
    ) ?? false
  );
}

function assignmentReferencesValidIds(assignment: SchemaAssignment, ids: Set<string>): boolean {
  if (typeof assignment === 'string') return ids.has(assignment);
  if (assignment.direct?.kind === 'schema' && !ids.has(assignment.direct.schemaId)) return false;
  for (const field of assignment.fields ?? []) {
    if (field.type.kind === 'schema' && !ids.has(field.type.schemaId)) return false;
  }
  return true;
}

function compactAssignment(use: ComponentSchemaUse): SchemaAssignment {
  if (use.fields?.length || use.defaults !== undefined || use.direct?.kind === 'type') return use;
  if (use.direct?.kind === 'schema') return use.direct.schemaId;
  return use;
}

function parsePersisted(raw: string | null): PersistedLibrary {
  if (!raw) return BLANK_PERSISTED;
  try {
    const value = JSON.parse(raw) as {
      seeded?: boolean;
      schemas?: unknown;
      custom?: unknown;
      overrides?: unknown;
      hidden?: unknown;
      assignments?: unknown;
    };
    const builtinIds = new Set(BUILTIN_SCHEMAS.map((schema) => schema.id));
    const listed = Array.isArray(value.schemas) ? value.schemas.filter(isLibrarySchema) : [];
    const custom = Array.isArray(value.custom) ? value.custom.filter(isLibrarySchema) : [];
    const overrides: Record<string, LibrarySchema> = {};
    if (value.overrides && typeof value.overrides === 'object' && !Array.isArray(value.overrides)) {
      for (const override of Object.values(value.overrides)) {
        if (isLibrarySchema(override) && builtinIds.has(override.id))
          overrides[override.id] = override;
      }
    }
    for (const schema of listed) {
      if (builtinIds.has(schema.id)) overrides[schema.id] = schema;
      else custom.push(schema);
    }
    const hidden = Array.isArray(value.hidden)
      ? value.hidden.filter((id): id is string => typeof id === 'string')
      : [];
    return {
      seeded: value.seeded === true,
      custom,
      overrides,
      hidden,
      assignments: assignmentRecord(value.assignments),
    };
  } catch {
    return BLANK_PERSISTED;
  }
}

/** Example values belong on the component form, not on the schema document. */
function withoutSchemaDefaults(schema: JsonSchema): JsonSchema {
  const next: JsonSchema = { ...schema };
  delete next.default;
  if (next.properties) {
    next.properties = Object.fromEntries(
      Object.entries(next.properties).map(([name, property]) => [
        name,
        withoutSchemaDefaults(property),
      ]),
    );
  }
  if (next.items) next.items = withoutSchemaDefaults(next.items);
  if (next.oneOf) next.oneOf = next.oneOf.map(withoutSchemaDefaults);
  if (next.anyOf) next.anyOf = next.anyOf.map(withoutSchemaDefaults);
  if (next.allOf) next.allOf = next.allOf.map(withoutSchemaDefaults);
  return next;
}

function withoutLibraryDefaults(schema: LibrarySchema): LibrarySchema {
  return { ...schema, schema: withoutSchemaDefaults(schema.schema) };
}

function materialize(saved: PersistedLibrary): SchemaLibraryState {
  const hidden = new Set(saved.hidden);
  const schemas: LibrarySchema[] = [];
  for (const builtin of BUILTIN_SCHEMAS) {
    if (hidden.has(builtin.id)) continue;
    schemas.push(withoutLibraryDefaults(saved.overrides[builtin.id] ?? builtin));
  }
  for (const schema of saved.custom) {
    if (!schemas.some((entry) => entry.id === schema.id))
      schemas.push(withoutLibraryDefaults(schema));
  }
  const assignments = {
    ...(saved.seeded ? {} : DEFAULT_SCHEMA_ASSIGNMENTS),
    ...saved.assignments,
  };
  const ids = new Set(schemas.map((schema) => schema.id));
  for (const [documentId, assignment] of Object.entries(assignments)) {
    if (!assignmentReferencesValidIds(assignment, ids)) delete assignments[documentId];
  }
  return { schemas, assignments };
}

function derivePersisted(next: SchemaLibraryState): PersistedLibrary {
  const builtinById = new Map(BUILTIN_SCHEMAS.map((schema) => [schema.id, schema]));
  const present = new Set(next.schemas.map((schema) => schema.id));
  const custom: LibrarySchema[] = [];
  const overrides: Record<string, LibrarySchema> = {};
  for (const schema of next.schemas) {
    const builtin = builtinById.get(schema.id);
    if (!builtin) custom.push(schema);
    else if (JSON.stringify(builtin) !== JSON.stringify(schema)) overrides[schema.id] = schema;
  }
  return {
    seeded: true,
    custom,
    overrides,
    hidden: BUILTIN_SCHEMAS.map((schema) => schema.id).filter((id) => !present.has(id)),
    assignments: next.assignments,
  };
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  const saved = parsePersisted(storage()?.getItem(STORAGE_KEY) ?? null);
  state = materialize(saved);
  if (!saved.seeded) storage()?.setItem(STORAGE_KEY, JSON.stringify(derivePersisted(state)));
}

function commit(next: SchemaLibraryState): void {
  state = next;
  storage()?.setItem(STORAGE_KEY, JSON.stringify(derivePersisted(next)));
  for (const listener of listeners) listener();
}

export function getSchemaLibrary(): SchemaLibraryState {
  ensureLoaded();
  return state;
}

export function subscribeSchemaLibrary(listener: () => void): () => void {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetSchemaLibrary(): void {
  loaded = true;
  state = EMPTY;
  storage()?.removeItem(STORAGE_KEY);
  for (const listener of listeners) listener();
}

/** Reads storage again. An empty or legacy library gains the built-in schemas. */
export function reloadSchemaLibrary(): SchemaLibraryState {
  loaded = false;
  ensureLoaded();
  return state;
}

function uniqueName(schemas: LibrarySchema[], base: string): string {
  const names = new Set(schemas.map((schema) => schema.name));
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

export function createLibrarySchema(name = 'Schema'): LibrarySchema {
  ensureLoaded();
  const schema: LibrarySchema = {
    id: createId(),
    name: uniqueName(state.schemas, name.trim() || 'Schema'),
    schema: emptyObjectSchema(),
  };
  commit({ ...state, schemas: [...state.schemas, schema] });
  return schema;
}

export function renameLibrarySchema(id: string, name: string): void {
  ensureLoaded();
  const nextName = name.trim();
  if (!nextName) return;
  commit({
    ...state,
    schemas: state.schemas.map((schema) =>
      schema.id === id ? { ...schema, name: nextName } : schema,
    ),
  });
}

export function updateLibrarySchema(id: string, schema: JsonSchema): void {
  ensureLoaded();
  commit({
    ...state,
    schemas: state.schemas.map((entry) => (entry.id === id ? { ...entry, schema } : entry)),
  });
}

export function removeLibrarySchema(id: string): void {
  ensureLoaded();
  const assignments = { ...state.assignments };
  for (const [documentId, assignment] of Object.entries(assignments)) {
    if (assignmentReferencesSchema(assignment, id)) delete assignments[documentId];
  }
  commit({
    schemas: state.schemas.filter((schema) => schema.id !== id),
    assignments,
  });
}

export function getComponentSchemaUse(documentId: string): ComponentSchemaUse | null {
  ensureLoaded();
  return schemaUseFromAssignment(state.assignments[documentId]);
}

export function setComponentSchemaUse(documentId: string, use: ComponentSchemaUse | null): void {
  ensureLoaded();
  const assignments = { ...state.assignments };
  if (!use) {
    delete assignments[documentId];
    commit({ ...state, assignments });
    return;
  }
  const compact = compactAssignment(use);
  const ids = schemaIds(state);
  if (!assignmentReferencesValidIds(compact, ids)) return;
  assignments[documentId] = compact;
  commit({ ...state, assignments });
}

export function assignLibrarySchema(documentId: string, schemaId: string | null): void {
  ensureLoaded();
  const assignments = { ...state.assignments };
  if (!schemaId || !state.schemas.some((schema) => schema.id === schemaId)) {
    delete assignments[documentId];
  } else {
    const existing = schemaUseFromAssignment(assignments[documentId]);
    if (existing && (existing.fields?.length || existing.defaults !== undefined)) {
      assignments[documentId] = {
        direct: { kind: 'schema', schemaId },
        ...(existing.fields?.length ? { fields: existing.fields } : {}),
        ...(existing.defaults !== undefined ? { defaults: existing.defaults } : {}),
      };
    } else {
      assignments[documentId] = schemaId;
    }
  }
  commit({ ...state, assignments });
}
