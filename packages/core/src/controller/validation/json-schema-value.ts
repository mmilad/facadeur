import type { JsonSchema } from '../../schema/document';
import { createAjv } from './ajv';

const ajv = createAjv();

/** Test a JSON value against its preserved JSON Schema contract, including unions. */
export function matchesSchemaValue(value: unknown, schema: JsonSchema): boolean {
  try {
    return Boolean(ajv.compile(schema)(value));
  } catch {
    return false;
  }
}

/** Match node field values using the catalog's partial-object semantics. */
export function matchesPartialSchemaValue(value: unknown, schema: JsonSchema): boolean {
  return matchesSchemaValue(
    value,
    optionalizeRequired(schema) as Parameters<typeof matchesSchemaValue>[1],
  );
}

/** Dynamic bindings are valid values for non-string schema fields until resolution. */
export function isFieldBindingValue(value: unknown, schema: unknown) {
  if (typeof value !== 'string') return false;
  const fieldSchema =
    schema && typeof schema === 'object' ? (schema as Record<string, unknown>) : {};
  if (
    fieldSchema.type === 'string' ||
    (Array.isArray(fieldSchema.type) && fieldSchema.type.includes('string'))
  ) {
    return false;
  }
  return (
    /^\{prop:[^}]+\}$/.test(value) ||
    /^\{item-prop:[^:}]+:[^}]+\}$/.test(value) ||
    /^[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)+$/.test(value)
  );
}

function optionalizeRequired(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(optionalizeRequired);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'required') continue;
    result[key] = optionalizeRequired(entry);
  }
  return result;
}
