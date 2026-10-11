import { Type } from '@sinclair/typebox';
import { UUID_PATTERN } from '../document/ids';

export const idSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
});

/** Slash-separated instance ids used for sparse overrides inside an instance.
 * Frame and root ids are intentionally omitted from these paths. */
export const childFieldPathSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*(/[A-Za-z][A-Za-z0-9_-]*)*$',
});

export const breakpointIdSchema = Type.String({ format: 'uuid', pattern: UUID_PATTERN.source });
