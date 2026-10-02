import { Type } from '@sinclair/typebox';
import { breakpointIdSchema, idSchema } from './schema-common.js';
import { tokenPathSchema } from './schema-layout.js';

const cssPropertySchema = Type.String({ pattern: '^(--)?[A-Za-z_][\\w-]*$' });
const styleDeclarationsSchema = Type.Record(cssPropertySchema, Type.String());

export const styleStatesSchema = Type.Object(
  {
    hover: Type.Optional(styleDeclarationsSchema),
    'focus-visible': Type.Optional(styleDeclarationsSchema),
    disabled: Type.Optional(styleDeclarationsSchema),
  },
  { additionalProperties: false },
);

export const styleLayerSchema = Type.Object(
  {
    declarations: Type.Optional(styleDeclarationsSchema),
    states: Type.Optional(styleStatesSchema),
  },
  { additionalProperties: false },
);

const variantStyleSchema = Type.Record(
  idSchema,
  Type.Record(Type.String({ minLength: 1 }), styleLayerSchema),
);

const breakpointStyleSchema = Type.Record(breakpointIdSchema, styleLayerSchema);
const styleTargetSchema = Type.String({
  pattern: '^[A-Za-z][A-Za-z0-9_-]*(?:/[A-Za-z][A-Za-z0-9_-]*)*$',
});

/** Sparse appearance for one local node or a rendered path to a nested instance root. */
export const styleChildSchema = Type.Object(
  {
    declarations: Type.Optional(styleDeclarationsSchema),
    states: Type.Optional(styleStatesSchema),
    variants: Type.Optional(variantStyleSchema),
    breakpoints: Type.Optional(breakpointStyleSchema),
  },
  { additionalProperties: false },
);

export const styleBlockSchema = Type.Object(
  {
    declarations: Type.Optional(styleDeclarationsSchema),
    states: Type.Optional(styleStatesSchema),
    variants: Type.Optional(variantStyleSchema),
    breakpoints: Type.Optional(breakpointStyleSchema),
    children: Type.Optional(Type.Record(styleTargetSchema, styleChildSchema)),
  },
  { additionalProperties: false },
);

export const tokenInterfaceSchema = Type.Object(
  {
    reads: Type.Optional(Type.Array(tokenPathSchema, { minItems: 1 })),
    sets: Type.Optional(Type.Record(tokenPathSchema, Type.String({ minLength: 1 }))),
  },
  { additionalProperties: false },
);
