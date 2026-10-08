import { Type } from '@sinclair/typebox';

/** Stable registry id (rename-safe). Distinct from legacy document `id` slugs. */
export const uuidSchema = Type.String({
  format: 'uuid',
  description: 'RFC 4122 uuid for catalog entries, schema refs, and tree nodes.',
});
