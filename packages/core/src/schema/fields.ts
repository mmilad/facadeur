import { Kind, Type, TypeRegistry } from '@sinclair/typebox';
import type { FieldValue } from '@facadeur/domain';
import { idSchema } from './common';
import type { JsonSchema } from './contract';

export type { FieldValue } from '@facadeur/domain';

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
