import { Kind, Type, TypeRegistry } from '@sinclair/typebox';
import type {
  DesignTokenFamily,
  DesignTokenSet,
  DesignTokenValue,
  DesignTokenValueType,
} from '@facadeur/domain';
import { uuidSchema } from './node-model/uuid';
import { isJsonValue } from '../utils';

export const tokenTypes = [
  'color',
  'dimension',
  'number',
  'fontFamily',
  'fontWeight',
  'shadow',
  'typography',
] as const satisfies readonly DesignTokenValueType[];

export const tokenTypeSchema = Type.Union(tokenTypes.map((value) => Type.Literal(value)));
export type TokenType = DesignTokenValueType;

const JSON_VALUE_KIND = 'DesignTokenValue';
if (!TypeRegistry.Has(JSON_VALUE_KIND)) {
  TypeRegistry.Set(JSON_VALUE_KIND, (_schema, value) => isJsonValue(value));
}

const jsonValueSchema = Type.Unsafe<DesignTokenValue>({
  [Kind]: JSON_VALUE_KIND,
  description: 'A JSON value.',
  anyOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'null' },
    { type: 'array', items: {} },
    { type: 'object', additionalProperties: {} },
  ],
});

export const designTokenRecordSchema = Type.Object(
  {
    uuid: uuidSchema,
    label: Type.String({ minLength: 1 }),
    group: Type.String(),
    valueType: tokenTypeSchema,
    value: jsonValueSchema,
    breakpoints: Type.Optional(Type.Record(uuidSchema, jsonValueSchema)),
    extensions: Type.Optional(Type.Record(Type.String(), jsonValueSchema)),
  },
  { additionalProperties: false },
);

const tokenFamilySchema = Type.Record(uuidSchema, designTokenRecordSchema);

export const designTokenSetSchema = Type.Object(
  {
    color: tokenFamilySchema,
    space: tokenFamilySchema,
    radius: tokenFamilySchema,
    shadow: tokenFamilySchema,
    type: tokenFamilySchema,
    font: tokenFamilySchema,
  },
  { additionalProperties: false },
);

export const tokenTreeSchema = designTokenSetSchema;

export type DesignTokenFamilyName = DesignTokenFamily;
export type DesignTokenSetModel = DesignTokenSet;
