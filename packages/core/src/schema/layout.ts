import { Type } from '@sinclair/typebox';
import { breakpointIdSchema } from './common.js';

/** `{color.blue.500}` — a token reference stored in a style or layout value. */
export const tokenRefSchema = Type.String({
  pattern: '^\\{[a-z][a-z0-9]*(\\.[a-z0-9]+)+\\}$',
});

/** `color.blue.500` — a token path, without braces. */
export const tokenPathSchema = Type.String({
  pattern: '^[a-z][a-z0-9]*(\\.[a-z0-9]+)+$',
});

export const spacingBoxSchema = Type.Object(
  {
    top: Type.Optional(tokenRefSchema),
    right: Type.Optional(tokenRefSchema),
    bottom: Type.Optional(tokenRefSchema),
    left: Type.Optional(tokenRefSchema),
  },
  { additionalProperties: false },
);

export const spacingSchema = Type.Union([tokenRefSchema, spacingBoxSchema]);

export const marginSideSchema = Type.Union([tokenRefSchema, Type.Literal('auto')]);
export const marginBoxSchema = Type.Object(
  {
    top: Type.Optional(marginSideSchema),
    right: Type.Optional(marginSideSchema),
    bottom: Type.Optional(marginSideSchema),
    left: Type.Optional(marginSideSchema),
  },
  { additionalProperties: false },
);
export const marginSchema = Type.Union([marginSideSchema, marginBoxSchema]);

export const sizeValueSchema = Type.Union([
  Type.Number({ exclusiveMinimum: 0 }),
  tokenRefSchema,
  Type.Object(
    {
      unit: Type.Literal('%'),
      value: Type.Number({ exclusiveMinimum: 0, maximum: 100 }),
    },
    { additionalProperties: false },
  ),
]);

export const axisSizeSchema = Type.Object(
  {
    mode: Type.Union([
      Type.Literal('auto'),
      Type.Literal('hug'),
      Type.Literal('fill'),
      Type.Literal('fixed'),
    ]),
    size: Type.Optional(sizeValueSchema),
    min: Type.Optional(sizeValueSchema),
    max: Type.Optional(sizeValueSchema),
  },
  { additionalProperties: false },
);

const layoutFields = {
  position: Type.Optional(Type.Union([Type.Literal('auto'), Type.Literal('absolute')])),
  x: Type.Optional(Type.Number()),
  y: Type.Optional(Type.Number()),
  width: Type.Optional(axisSizeSchema),
  height: Type.Optional(axisSizeSchema),
  direction: Type.Optional(Type.Union([Type.Literal('row'), Type.Literal('column')])),
  gap: Type.Optional(tokenRefSchema),
  padding: Type.Optional(spacingSchema),
  margin: Type.Optional(marginSchema),
  justify: Type.Optional(
    Type.Union([
      Type.Literal('start'),
      Type.Literal('center'),
      Type.Literal('end'),
      Type.Literal('space-between'),
    ]),
  ),
  align: Type.Optional(
    Type.Union([
      Type.Literal('start'),
      Type.Literal('center'),
      Type.Literal('end'),
      Type.Literal('stretch'),
    ]),
  ),
  wrap: Type.Optional(Type.Boolean()),
};

/** Layout fields that a breakpoint may override. Breakpoints do not nest. */
export const layoutOverrideSchema = Type.Object(layoutFields, { additionalProperties: false });

export const layoutSchema = Type.Object(
  {
    ...layoutFields,
    breakpoints: Type.Optional(Type.Record(breakpointIdSchema, layoutOverrideSchema)),
  },
  { additionalProperties: false },
);
