import { basicTypeOptions } from '../../domain/schema-use.js';
import type { LibrarySchema } from '../../domain/schema-library.js';

export function schemaTypeOptions(schemas: LibrarySchema[]): { value: string; label: string }[] {
  return [
    ...basicTypeOptions(),
    ...schemas.map((schema) => ({ value: `schema:${schema.id}`, label: schema.name })),
  ];
}
