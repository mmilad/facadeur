import { Type } from '@sinclair/typebox';
import { UUID_PATTERN } from '../../document/ids';

/** Stable registry id (rename-safe). Distinct from legacy document `id` slugs. */
export const uuidSchema = Type.String({
  format: 'uuid',
  pattern: UUID_PATTERN.source,
  description: 'RFC 4122 uuid for catalog entries, schema refs, and tree nodes.',
});
