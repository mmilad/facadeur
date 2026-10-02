import { Type } from '@sinclair/typebox';
import { idSchema } from './schema-common.js';
import { fieldValueSchema } from './schema-fields.js';

export const tokenTypes = [
  'color',
  'dimension',
  'number',
  'fontFamily',
  'fontWeight',
  'shadow',
  'typography',
] as const;
export type TokenType = (typeof tokenTypes)[number];

export const tokenTypeSchema = Type.Union([
  Type.Literal('color'),
  Type.Literal('dimension'),
  Type.Literal('number'),
  Type.Literal('fontFamily'),
  Type.Literal('fontWeight'),
  Type.Literal('shadow'),
  Type.Literal('typography'),
]);

/**
 * DTCG group or token. The published schema is structural; `readTokenTree` enforces
 * inheritance, names, and value shapes. A recursive TypeBox type here makes the
 * document's Static type collapse, so the JSON Schema is written by hand.
 */
export const tokenTreeSchema = Type.Unsafe<Record<string, unknown>>({
  $ref: '#/$defs/dtcgNode',
});

export const DTCG_DEFS = {
  jsonValue: {
    anyOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'array', items: { $ref: '#/$defs/jsonValue' } },
      { type: 'object', additionalProperties: { $ref: '#/$defs/jsonValue' } },
    ],
  },
  facadeurExtension: {
    type: 'object',
    additionalProperties: false,
    properties: {
      tier: { enum: ['primitive', 'semantic', 'component'] },
      breakpoints: {
        type: 'object',
        propertyNames: { pattern: '^[a-z][a-z0-9]*$' },
        additionalProperties: { $ref: '#/$defs/jsonValue' },
      },
      label: { type: 'string', minLength: 1 },
    },
  },
  tokenExtensions: {
    type: 'object',
    additionalProperties: { $ref: '#/$defs/jsonValue' },
    properties: {
      facadeur: { $ref: '#/$defs/facadeurExtension' },
    },
  },
  dtcgNode: {
    type: 'object',
    additionalProperties: false,
    description:
      'DTCG group or token. $value makes an object a token. Group $type is inherited. Child names match [a-z0-9]+.',
    properties: {
      $value: { $ref: '#/$defs/jsonValue' },
      $type: {
        enum: ['color', 'dimension', 'number', 'fontFamily', 'fontWeight', 'shadow', 'typography'],
      },
      $description: { type: 'string' },
      $deprecated: { anyOf: [{ type: 'boolean' }, { type: 'string' }] },
      $extensions: { $ref: '#/$defs/tokenExtensions' },
    },
    patternProperties: {
      '^[a-z0-9]+$': { $ref: '#/$defs/dtcgNode' },
    },
  },
} as const;

/** Attach token definitions without changing the TypeBox static type. */
export function withTokenDefs<T extends object>(schema: T): T {
  Object.assign(schema, { $defs: DTCG_DEFS });
  return schema;
}

export const fontStyleSchema = Type.Union([Type.Literal('normal'), Type.Literal('italic')]);

export const fontFaceFileSchema = Type.Object(
  {
    weight: Type.Integer({ minimum: 1, maximum: 1000 }),
    style: fontStyleSchema,
    url: Type.String({ minLength: 1 }),
    format: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const fontSourceSchema = Type.Union([
  Type.Object(
    {
      type: Type.Literal('file'),
      files: Type.Array(fontFaceFileSchema, { minItems: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Literal('google'),
      family: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
]);

export const fontFamilySchema = Type.Object(
  {
    id: Type.String({ pattern: '^[a-z][a-z0-9]*$' }),
    family: Type.String({ minLength: 1 }),
    weights: Type.Array(Type.Integer({ minimum: 1, maximum: 1000 }), { minItems: 1 }),
    styles: Type.Optional(Type.Array(fontStyleSchema, { minItems: 1 })),
    source: fontSourceSchema,
    fallbacks: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
  },
  { additionalProperties: false },
);

export const iconDefinitionSchema = Type.Object(
  {
    id: idSchema,
    name: Type.String({ minLength: 1 }),
    src: Type.String({ minLength: 1 }),
    category: Type.Optional(idSchema),
  },
  { additionalProperties: false },
);

export const breakpointSchema = Type.Object(
  {
    id: Type.String({ pattern: '^[a-z][a-z0-9]*$' }),
    label: Type.Optional(Type.String({ minLength: 1, maxLength: 48 })),
    minWidth: Type.Integer({ minimum: 1 }),
    /** When false, the viewport stays configured but is hidden from tabs and the stage. */
    enabled: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

/** Editor sample values. Never part of the component's runtime defaults. */
export const previewDataSchema = Type.Object(
  {
    fields: Type.Optional(Type.Record(idSchema, fieldValueSchema)),
    variants: Type.Optional(Type.Record(idSchema, Type.Record(idSchema, fieldValueSchema))),
  },
  { additionalProperties: false },
);

export const settingsSchema = Type.Object(
  {
    artboard: Type.Optional(
      Type.Object(
        {
          width: Type.Number({ exclusiveMinimum: 0 }),
          height: Type.Number({ exclusiveMinimum: 0 }),
        },
        { additionalProperties: false },
      ),
    ),
    breakpoints: Type.Optional(Type.Array(breakpointSchema, { minItems: 1 })),
  },
  { additionalProperties: false },
);
