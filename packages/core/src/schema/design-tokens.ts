import { Type } from '@sinclair/typebox';
import type {
  DesignTokenFamily,
  DesignTokenSet,
  DesignTokenValue,
  DesignTokenValueType,
} from '@facadeur/domain';
import { uuidSchema } from './node-model/uuid';

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

const jsonValueSchema = Type.Unsafe<DesignTokenValue>({
  description: 'JSON value validated against its valueType by the Core token contract.',
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
