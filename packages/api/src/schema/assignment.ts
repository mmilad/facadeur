import type { ComponentSchemaUse, SchemaFieldUse, SchemaTypeRef } from '@facadeur/core';
const BASIC_SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'object', 'array'] as const;

export function isSchemaFieldUse(value: unknown): value is SchemaFieldUse {
  if (!value || typeof value !== 'object') return false;
  const field = value as SchemaFieldUse;
  return typeof field.name === 'string' && field.name.length > 0 && isTypeRef(field.type);
}

export function isComponentSchemaUse(value: unknown): value is ComponentSchemaUse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const use = value as ComponentSchemaUse;
  if (use.direct !== undefined && !isTypeRef(use.direct)) return false;
  if (
    use.fields !== undefined &&
    !(Array.isArray(use.fields) && use.fields.every(isSchemaFieldUse))
  ) {
    return false;
  }
  return use.direct !== undefined || use.fields !== undefined || use.defaults !== undefined;
}

function isTypeRef(value: unknown): value is SchemaTypeRef {
  if (!value || typeof value !== 'object') return false;
  const ref = value as SchemaTypeRef;
  if (ref.kind === 'type') return BASIC_SCHEMA_TYPES.includes(ref.type);
  return ref.kind === 'schema' && typeof ref.schemaId === 'string' && ref.schemaId.length > 0;
}

export function schemaUseFromAssignment(
  value: string | ComponentSchemaUse | undefined,
): ComponentSchemaUse | null {
  if (typeof value === 'string' && value.length > 0) {
    return { direct: { kind: 'schema', schemaId: value } };
  }
  if (isComponentSchemaUse(value)) return value;
  return null;
}
