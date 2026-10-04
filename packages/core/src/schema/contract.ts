import { Type } from '@sinclair/typebox';
import { idSchema } from './common.js';

/** JSON Schema supported by the shared schema catalog and component assignments. */
export interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  default?: unknown;
  additionalProperties?: boolean | JsonSchema;
  [keyword: string]: unknown;
}

export interface NamedSchema {
  id: string;
  name: string;
  description?: string;
  schema: JsonSchema;
}

export interface SchemaCatalog {
  schemas: NamedSchema[];
}

export const basicSchemaTypes = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
] as const;
export type BasicSchemaType = (typeof basicSchemaTypes)[number];

export type SchemaTypeRef =
  { kind: 'type'; type: BasicSchemaType } | { kind: 'schema'; schemaId: string };

export interface SchemaFieldUse {
  name: string;
  type: SchemaTypeRef;
}

/** A component's active assignment to the named schema catalog. */
export interface ComponentSchemaUse {
  direct?: SchemaTypeRef;
  fields?: SchemaFieldUse[];
  defaults?: unknown;
}

const basicSchemaTypeSchema = Type.Union([
  Type.Literal('string'),
  Type.Literal('number'),
  Type.Literal('integer'),
  Type.Literal('boolean'),
  Type.Literal('object'),
  Type.Literal('array'),
]);

export const schemaTypeRefSchema = Type.Union([
  Type.Object(
    { kind: Type.Literal('type'), type: basicSchemaTypeSchema },
    { additionalProperties: false },
  ),
  Type.Object(
    { kind: Type.Literal('schema'), schemaId: Type.String({ minLength: 1 }) },
    { additionalProperties: false },
  ),
]);

export const schemaFieldUseSchema = Type.Object(
  { name: idSchema, type: schemaTypeRefSchema },
  { additionalProperties: false },
);

export const componentSchemaUseSchema = Type.Object(
  {
    direct: Type.Optional(schemaTypeRefSchema),
    fields: Type.Optional(Type.Array(schemaFieldUseSchema)),
    defaults: Type.Optional(Type.Unknown()),
  },
  { additionalProperties: false },
);

const jsonSchemaNode = Type.Recursive((Self) =>
  Type.Object(
    {
      $ref: Type.Optional(Type.String({ minLength: 1 })),
      type: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
      title: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      properties: Type.Optional(Type.Record(Type.String(), Self)),
      required: Type.Optional(Type.Array(Type.String())),
      items: Type.Optional(Self),
      enum: Type.Optional(Type.Array(Type.Unknown())),
      oneOf: Type.Optional(Type.Array(Self)),
      anyOf: Type.Optional(Type.Array(Self)),
      allOf: Type.Optional(Type.Array(Self)),
      default: Type.Optional(Type.Unknown()),
      additionalProperties: Type.Optional(Type.Union([Type.Boolean(), Self])),
    },
    { additionalProperties: true },
  ),
);

export const namedSchemaSchema = Type.Object(
  {
    id: idSchema,
    name: Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    schema: jsonSchemaNode,
  },
  { additionalProperties: false },
);

export const schemaCatalogSchema = Type.Object(
  { schemas: Type.Array(namedSchemaSchema) },
  { additionalProperties: false },
);
