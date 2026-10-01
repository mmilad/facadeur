import { Type } from '@sinclair/typebox';

export const idSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
});

export const dataPathSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z_$][A-Za-z0-9_$-]*(\\.[A-Za-z_$][A-Za-z0-9_$-]*)*$',
});

/** Slash-separated instance ids used for sparse overrides inside an instance.
 * Frame and root ids are intentionally omitted from these paths. */
export const childFieldPathSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*(/[A-Za-z][A-Za-z0-9_-]*)*$',
});

export const kindSchema = Type.Union([
  Type.Literal('atom'),
  Type.Literal('component'),
  Type.Literal('section'),
  Type.Literal('page'),
]);

/** Stable node target used by variant overlays. IDs remain valid for compatibility;
 * dotted paths disambiguate nested targets such as `root.header.lede`. */
export const nodeTargetSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*(\\.[A-Za-z][A-Za-z0-9_-]*)*$',
});

/** A variant may explicitly clear an optional node property or map entry. */
export const variantUnsetPathSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_./-]*$',
});

export const stringMapSchema = Type.Record(Type.String({ minLength: 1 }), Type.String());

export const breakpointIdSchema = Type.String({ pattern: '^[a-z][a-z0-9]*$' });
