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
