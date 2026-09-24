import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { defaultKinds } from './kinds.js';

export const fieldTypes = [
  'text',
  'richText',
  'image',
  'link',
  'boolean',
  'enum',
  'number',
  'token',
] as const;
export type FieldType = (typeof fieldTypes)[number];

export const bindingTargets = ['text', 'attribute', 'style', 'visible', 'src', 'alt'] as const;
export type BindingTarget = (typeof bindingTargets)[number];

const idSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*$',
});

export const fieldValueSchema = Type.Union([Type.String(), Type.Number(), Type.Boolean()]);

export const fieldTypeSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('richText'),
  Type.Literal('image'),
  Type.Literal('link'),
  Type.Literal('boolean'),
  Type.Literal('enum'),
  Type.Literal('number'),
  Type.Literal('token'),
]);

export const bindingTargetSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('attribute'),
  Type.Literal('style'),
  Type.Literal('visible'),
  Type.Literal('src'),
  Type.Literal('alt'),
]);

export const kindSchema = Type.Union([
  Type.Literal('atom'),
  Type.Literal('component'),
  Type.Literal('section'),
  Type.Literal('page'),
]);

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

export const breakpointSchema = Type.Object(
  {
    id: Type.String({ pattern: '^[a-z][a-z0-9]*$' }),
    minWidth: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const fieldDefinitionSchema = Type.Object(
  {
    name: idSchema,
    type: fieldTypeSchema,
    default: Type.Optional(fieldValueSchema),
    options: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
  },
  { additionalProperties: false },
);

export const variantAxisSchema = Type.Object(
  {
    name: idSchema,
    values: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
    default: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

/** `{color.blue.500}` — a token reference stored in a style or layout value. */
export const tokenRefSchema = Type.String({
  pattern: '^\\{[a-z][a-z0-9]*(\\.[a-z0-9]+)+\\}$',
});

/** `color.blue.500` — a token path, without braces. */
export const tokenPathSchema = Type.String({
  pattern: '^[a-z][a-z0-9]*(\\.[a-z0-9]+)+$',
});

const breakpointIdSchema = Type.String({ pattern: '^[a-z][a-z0-9]*$' });

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
    mode: Type.Union([Type.Literal('hug'), Type.Literal('fill'), Type.Literal('fixed')]),
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
  margin: Type.Optional(spacingSchema),
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

/** A descendant rule. One level deep: nested instances carry their own style block. */
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
    children: Type.Optional(Type.Record(idSchema, styleChildSchema)),
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

export const bindingSchema = Type.Object(
  {
    field: idSchema,
    target: bindingTargetSchema,
    name: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const stringMapSchema = Type.Record(Type.String({ minLength: 1 }), Type.String());

const sharedNodeProps = {
  id: idSchema,
  name: Type.Optional(Type.String({ minLength: 1 })),
  tag: Type.Optional(Type.String({ pattern: '^[A-Za-z][A-Za-z0-9-]*$' })),
  attributes: Type.Optional(stringMapSchema),
  layout: Type.Optional(layoutSchema),
  bindings: Type.Optional(Type.Array(bindingSchema)),
  style: Type.Optional(stringMapSchema),
};

export const nestedNodeSchema = Type.Recursive((Self) =>
  Type.Union([
    Type.Object(
      {
        ...sharedNodeProps,
        type: Type.Literal('frame'),
        children: Type.Optional(Type.Array(Self)),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        ...sharedNodeProps,
        type: Type.Literal('text'),
        text: Type.Optional(Type.String()),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        ...sharedNodeProps,
        type: Type.Literal('image'),
        src: Type.Optional(Type.String()),
        alt: Type.Optional(Type.String()),
      },
      { additionalProperties: false },
    ),
    Type.Object(
      {
        id: idSchema,
        name: Type.Optional(Type.String({ minLength: 1 })),
        layout: Type.Optional(layoutSchema),
        type: Type.Literal('instance'),
        component: idSchema,
        fields: Type.Optional(Type.Record(idSchema, fieldValueSchema)),
        variants: Type.Optional(Type.Record(idSchema, Type.String())),
      },
      { additionalProperties: false },
    ),
  ]),
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

export const DOCUMENT_SCHEMA_ID = 'https://github.com/mmilad/facadeur/schema/document.schema.json';

export interface DocumentSchemaOptions {
  kinds?: readonly string[];
  schemaId?: string;
}

const DTCG_DEFS = {
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
function withTokenDefs<T extends object>(schema: T): T {
  Object.assign(schema, { $defs: DTCG_DEFS });
  return schema;
}

const documentSchemaMeta = {
  additionalProperties: false,
  title: 'Facadeur document',
  description:
    'Nested facadeur document. Nodes are frame, text, image, or instance. Tokens are a DTCG tree. Fonts list families and their sources. A style block paints the component. Instances override fields and variants only.',
} as const;

function documentProperties<Kind extends TSchema>(kind: Kind) {
  return {
    version: Type.Literal(1),
    id: idSchema,
    name: Type.String({ minLength: 1 }),
    kind,
    fields: Type.Optional(Type.Array(fieldDefinitionSchema)),
    variants: Type.Optional(Type.Array(variantAxisSchema)),
    settings: Type.Optional(settingsSchema),
    fonts: Type.Optional(Type.Array(fontFamilySchema, { minItems: 1 })),
    tokens: Type.Optional(tokenTreeSchema),
    styles: Type.Optional(styleBlockSchema),
    tokenInterface: Type.Optional(tokenInterfaceSchema),
    root: nestedNodeSchema,
  };
}

export const documentFileSchema = withTokenDefs(
  Type.Object(documentProperties(kindSchema), {
    ...documentSchemaMeta,
    $id: DOCUMENT_SCHEMA_ID,
  }),
);

/** JSON Schema for one nested document. Kinds default to atom, component, section, and page. */
export function createDocumentSchema(options: DocumentSchemaOptions = {}) {
  if (!options.kinds && !options.schemaId) return documentFileSchema;
  return withTokenDefs(
    Type.Object(documentProperties(literalUnion(options.kinds ?? [...defaultKinds])), {
      ...documentSchemaMeta,
      $id: options.schemaId ?? DOCUMENT_SCHEMA_ID,
    }),
  );
}

export type FieldValue = Static<typeof fieldValueSchema>;
export type FieldDefinition = Static<typeof fieldDefinitionSchema>;
export type VariantAxis = Static<typeof variantAxisSchema>;
export type Layout = Static<typeof layoutSchema>;
export type LayoutOverride = Static<typeof layoutOverrideSchema>;
export type AxisSize = Static<typeof axisSizeSchema>;
export type SizeValue = Static<typeof sizeValueSchema>;
export type Spacing = Static<typeof spacingSchema>;
export type SpacingBox = Static<typeof spacingBoxSchema>;
export type StyleDeclarations = Record<string, string>;
export type StyleStates = Static<typeof styleStatesSchema>;
export type StyleLayer = Static<typeof styleLayerSchema>;
export type StyleChild = Static<typeof styleChildSchema>;
export type StyleBlock = Static<typeof styleBlockSchema>;
export type TokenInterface = Static<typeof tokenInterfaceSchema>;
export type Binding = Static<typeof bindingSchema>;
export type NestedNode = Static<typeof nestedNodeSchema>;
export type DocumentSettings = Static<typeof settingsSchema>;
export type DocumentFile = Static<typeof documentFileSchema>;
export type FontStyle = Static<typeof fontStyleSchema>;
export type FontFaceFile = Static<typeof fontFaceFileSchema>;
export type FontSource = Static<typeof fontSourceSchema>;
export type FontFamily = Static<typeof fontFamilySchema>;
export type Breakpoint = Static<typeof breakpointSchema>;

/** Viewports used when a document does not set its own breakpoints. */
export const defaultBreakpoints: Breakpoint[] = [
  { id: 'mobile', minWidth: 375 },
  { id: 'tablet', minWidth: 768 },
  { id: 'desktop', minWidth: 1440 },
];

function literalUnion(values: readonly string[]): TSchema {
  const literals = values.map((value) => Type.Literal(value));
  const first = literals[0];
  if (!first) {
    throw new Error('A schema union needs at least one value');
  }
  if (literals.length === 1) return first;
  return Type.Union(literals as unknown as [TSchema, ...TSchema[]]);
}

/** Plain JSON Schema document for agents and Ajv, including the draft keyword. */
export function documentJsonSchema(options: DocumentSchemaOptions = {}): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...(createDocumentSchema(options) as unknown as Record<string, unknown>),
  };
}
