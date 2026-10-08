import { Kind, Type, TypeRegistry } from '@sinclair/typebox';
import { dataPathSchema, idSchema } from './common';
import { schemaFieldUseSchema, schemaTypeRefSchema, type JsonSchema } from './contract';

export const fieldTypes = [
  'text',
  'richText',
  'image',
  'link',
  'boolean',
  'enum',
  'number',
  'token',
  'array',
  'object',
] as const;
export type FieldType = (typeof fieldTypes)[number];

export const bindingTargets = [
  'text',
  'attribute',
  'style',
  'visible',
  'src',
  'alt',
  'options',
] as const;
export type BindingTarget = (typeof bindingTargets)[number];

export type FieldValue = string | number | boolean | FieldValue[] | { [key: string]: FieldValue };

export function isFieldValue(value: unknown): value is FieldValue {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isFieldValue(entry));
  }
  if (typeof value === 'object') {
    return Object.values(value).every((entry) => isFieldValue(entry));
  }
  return false;
}

const FIELD_VALUE_KIND = 'FieldValue';
if (!TypeRegistry.Has(FIELD_VALUE_KIND)) {
  TypeRegistry.Set(FIELD_VALUE_KIND, (_schema, value) => isFieldValue(value));
}

/** JSON Schema export uses anyOf; runtime validation uses {@link TypeRegistry}. */
export const fieldValueSchema = Type.Unsafe<FieldValue>({
  [Kind]: FIELD_VALUE_KIND,
  anyOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'array' },
    { type: 'object', additionalProperties: true },
  ],
});

export const fieldTypeSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('richText'),
  Type.Literal('image'),
  Type.Literal('link'),
  Type.Literal('boolean'),
  Type.Literal('enum'),
  Type.Literal('number'),
  Type.Literal('token'),
  Type.Literal('array'),
  Type.Literal('object'),
]);

export const bindingTargetSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('attribute'),
  Type.Literal('style'),
  Type.Literal('visible'),
  Type.Literal('src'),
  Type.Literal('alt'),
  Type.Literal('options'),
]);

export const fieldDefinitionSchema = Type.Recursive((Self) =>
  Type.Object(
    {
      name: idSchema,
      type: fieldTypeSchema,
      schema: Type.Optional(Type.Unsafe<JsonSchema>()),
      required: Type.Optional(Type.Boolean()),
      default: Type.Optional(fieldValueSchema),
      options: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
      items: Type.Optional(
        Type.Object(
          {
            type: fieldTypeSchema,
            schema: Type.Optional(Type.Unsafe<JsonSchema>()),
            options: Type.Optional(
              Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true }),
            ),
            fields: Type.Optional(Type.Array(Self)),
          },
          { additionalProperties: false },
        ),
      ),
    },
    { additionalProperties: false },
  ),
);

/** A semantic event exposed by an atom or component. Payload keys use field types. */
export const eventDefinitionSchema = Type.Object(
  {
    name: idSchema,
    payload: Type.Optional(Type.Record(idSchema, fieldTypeSchema)),
    data: Type.Optional(
      Type.Object(
        {
          direct: Type.Optional(schemaTypeRefSchema),
          fields: Type.Optional(Type.Array(schemaFieldUseSchema)),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

/** @deprecated Legacy alias path; retained until child-contract inheritance migration. */
export const exposePathSchema = Type.String({
  minLength: 1,
  pattern: '^[A-Za-z][A-Za-z0-9_-]*(\\.[A-Za-z][A-Za-z0-9_-]*)*$',
});

/** @deprecated Parent-authored aliases; retained for existing documents pending child-contract inheritance. */
export const exposeSchema = Type.Object(
  {
    fields: Type.Optional(Type.Record(idSchema, exposePathSchema)),
    events: Type.Optional(Type.Record(idSchema, exposePathSchema)),
  },
  { additionalProperties: false, deprecated: true },
);

/** Maps a semantic atom event to a native event on the node. */
export const eventBindingSchema = Type.Object(
  {
    event: idSchema,
    name: Type.String({ minLength: 1 }),
    payload: Type.Optional(
      Type.Record(
        idSchema,
        Type.Union([Type.Literal('value'), Type.Literal('checked'), Type.Literal('valueAsNumber')]),
      ),
    ),
    data: Type.Optional(
      Type.Array(
        Type.Object(
          {
            path: Type.String({
              pattern: '^(?:[A-Za-z_$][A-Za-z0-9_$-]*(?:\\.[A-Za-z_$][A-Za-z0-9_$-]*)*)?$',
            }),
            source: Type.Union([
              Type.Object(
                {
                  kind: Type.Literal('native'),
                  path: Type.Union([
                    Type.Literal('currentTarget.value'),
                    Type.Literal('currentTarget.checked'),
                    Type.Literal('currentTarget.valueAsNumber'),
                  ]),
                },
                { additionalProperties: false },
              ),
              Type.Object(
                { kind: Type.Literal('context'), path: dataPathSchema },
                { additionalProperties: false },
              ),
              Type.Object(
                { kind: Type.Literal('literal'), value: fieldValueSchema },
                { additionalProperties: false },
              ),
            ]),
          },
          { additionalProperties: false },
        ),
      ),
    ),
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

const displayOnPath = { path: dataPathSchema };

/** A render condition has exactly one predicate so preview and codegen agree. */
export const displayOnSchema = Type.Union([
  Type.Object({ ...displayOnPath, equals: fieldValueSchema }, { additionalProperties: false }),
  Type.Object({ ...displayOnPath, truthy: Type.Boolean() }, { additionalProperties: false }),
]);

export const repeatSchema = Type.Object(
  {
    path: dataPathSchema,
    as: Type.Optional(idSchema),
    key: Type.Optional(dataPathSchema),
  },
  { additionalProperties: false },
);

export const variantRuleSchema = Type.Object(
  { when: displayOnSchema, variant: idSchema },
  { additionalProperties: false },
);
