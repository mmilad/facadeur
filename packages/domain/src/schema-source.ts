import type { Uuid } from './uuid';

export type JsonSchemaObject = Readonly<Record<string, unknown>>;

export type SchemaSource =
  | { readonly kind: 'ref'; readonly uuid: Uuid }
  | { readonly kind: 'inline'; readonly schema: JsonSchemaObject };
