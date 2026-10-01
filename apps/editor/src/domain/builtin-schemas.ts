import catalog from '../../../../examples/schemas.json';
import type { LibrarySchema } from './schema-library.js';

/**
 * Built-in component schemas. Add a contract in examples/schemas.json; this
 * module only reads that file.
 */
interface SchemaCatalog {
  assignments?: Record<string, string>;
  schemas?: LibrarySchema[];
}

const source = catalog as unknown as SchemaCatalog;

function isBuiltin(value: unknown): value is LibrarySchema {
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

export const BUILTIN_SCHEMAS: LibrarySchema[] = (source.schemas ?? []).filter(isBuiltin);

export const DEFAULT_SCHEMA_ASSIGNMENTS: Record<string, string> = Object.fromEntries(
  Object.entries(source.assignments ?? {}).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === 'string' && BUILTIN_SCHEMAS.some((schema) => schema.id === entry[1]),
  ),
);
