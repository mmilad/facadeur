import type { NamedSchema as LibrarySchema } from '@facadeur/core';
import { starterSchemas } from '../server/project/starter-schemas';

/** Built-in schema library until project catalogs are API-only. */
export const BUILTIN_SCHEMAS: LibrarySchema[] = starterSchemas;

export const DEFAULT_SCHEMA_ASSIGNMENTS: Record<string, string> = {
  image: 'image',
};
