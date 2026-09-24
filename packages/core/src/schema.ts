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

export const layoutSchema = Type.Object(
  {
    position: Type.Optional(Type.Union([Type.Literal('auto'), Type.Literal('absolute')])),
    x: Type.Optional(Type.Number()),
    y: Type.Optional(Type.Number()),
    width: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    height: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
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
  },
  { additionalProperties: false },
);

export const DOCUMENT_SCHEMA_ID = 'https://github.com/mmilad/facadeur/schema/document.schema.json';

export interface DocumentSchemaOptions {
  kinds?: readonly string[];
  schemaId?: string;
}

const documentSchemaMeta = {
  additionalProperties: false,
  title: 'Facadeur document',
  description:
    'Nested facadeur document. Nodes are frame, text, image, or instance. Instances override fields and variants only.',
} as const;

export const documentFileSchema = Type.Object(
  {
    version: Type.Literal(1),
    id: idSchema,
    name: Type.String({ minLength: 1 }),
    kind: kindSchema,
    fields: Type.Optional(Type.Array(fieldDefinitionSchema)),
    variants: Type.Optional(Type.Array(variantAxisSchema)),
    settings: Type.Optional(settingsSchema),
    root: nestedNodeSchema,
  },
  { ...documentSchemaMeta, $id: DOCUMENT_SCHEMA_ID },
);

/** JSON Schema for one nested document. Kinds default to atom, component, section, and page. */
export function createDocumentSchema(options: DocumentSchemaOptions = {}) {
  if (!options.kinds && !options.schemaId) return documentFileSchema;
  return Type.Object(
    {
      version: Type.Literal(1),
      id: idSchema,
      name: Type.String({ minLength: 1 }),
      kind: literalUnion(options.kinds ?? [...defaultKinds]),
      fields: Type.Optional(Type.Array(fieldDefinitionSchema)),
      variants: Type.Optional(Type.Array(variantAxisSchema)),
      settings: Type.Optional(settingsSchema),
      root: nestedNodeSchema,
    },
    { ...documentSchemaMeta, $id: options.schemaId ?? DOCUMENT_SCHEMA_ID },
  );
}

export type FieldValue = Static<typeof fieldValueSchema>;
export type FieldDefinition = Static<typeof fieldDefinitionSchema>;
export type VariantAxis = Static<typeof variantAxisSchema>;
export type Layout = Static<typeof layoutSchema>;
export type Binding = Static<typeof bindingSchema>;
export type NestedNode = Static<typeof nestedNodeSchema>;
export type DocumentSettings = Static<typeof settingsSchema>;
export type DocumentFile = Static<typeof documentFileSchema>;

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
