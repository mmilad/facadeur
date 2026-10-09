import { Type } from '@sinclair/typebox';
import { idSchema } from './common';
import { fieldValueSchema } from './fields';
import { uuidSchema } from './node-model/uuid';

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
    uuid: uuidSchema,
    label: Type.String({ minLength: 1, maxLength: 48 }),
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
