import type { JsonSchema } from '../../schema/document';
import { matchesSchemaValue } from './json-schema-value';

/** Prefer valid contracts describing supplied fields; configured order breaks ties. */
export function matchingSchemaIndex(value: unknown, schemas: readonly JsonSchema[]) {
  let selected = -1;
  let bestScore = -1;
  const keys =
    value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value) : [];
  schemas.forEach((schema, index) => {
    if (!matchesSchemaValue(value, schema)) return;
    const properties = matchingProperties(value, schema);
    const score = keys.filter((key) => properties.has(key)).length;
    if (score > bestScore) {
      selected = index;
      bestScore = score;
    }
  });
  return selected;
}

function matchingProperties(value: unknown, schema: JsonSchema): Set<string> {
  const properties = new Set(Object.keys(schema.properties ?? {}));
  for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
    for (const branch of schema[keyword] ?? []) {
      if (!matchesSchemaValue(value, branch)) continue;
      for (const key of matchingProperties(value, branch)) properties.add(key);
    }
  }
  return properties;
}
