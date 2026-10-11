export const BASIC_SCHEMA_TYPES = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
] as const;

export type BasicSchemaType = (typeof BASIC_SCHEMA_TYPES)[number];

export type SchemaTypeRef =
  { kind: 'type'; type: BasicSchemaType } | { kind: 'schema'; schemaId: string };

export interface SchemaFieldUse {
  name: string;
  type: SchemaTypeRef;
}

/** How one component uses the schema library. A string assignment is the same as a direct schema. */
export interface SchemaTypeSelection {
  direct?: SchemaTypeRef;
  fields?: SchemaFieldUse[];
}

export interface ComponentSchemaUse extends SchemaTypeSelection {
  defaults?: unknown;
}

const BASIC_LABEL: Record<BasicSchemaType, string> = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Boolean',
  object: 'Object',
  array: 'Array',
};

export function basicTypeOptions(): { value: string; label: string }[] {
  return BASIC_SCHEMA_TYPES.map((type) => ({ value: `type:${type}`, label: BASIC_LABEL[type] }));
}

export function typeRefValue(ref: SchemaTypeRef): string {
  return ref.kind === 'type' ? `type:${ref.type}` : `schema:${ref.schemaId}`;
}

export function parseTypeRef(value: string): SchemaTypeRef | null {
  if (value.startsWith('type:')) {
    const type = value.slice(5);
    if (BASIC_SCHEMA_TYPES.includes(type as BasicSchemaType)) {
      return { kind: 'type', type: type as BasicSchemaType };
    }
  }
  if (value.startsWith('schema:') && value.length > 'schema:'.length) {
    return { kind: 'schema', schemaId: value.slice('schema:'.length) };
  }
  return null;
}
