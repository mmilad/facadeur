import Ajv from 'ajv';
import type { JsonSchema, SchemaCatalog } from '../../schema/document';

const ajv = new Ajv({ allErrors: true, strict: false });

/** Test a JSON value against its preserved JSON Schema contract, including unions. */
export function matchesSchemaValue(value: unknown, schema: JsonSchema): boolean {
  try {
    return Boolean(ajv.compile(schema)(value));
  } catch {
    return false;
  }
}

/** Accept old payload-only samples for newly discriminated structural unions. */
export function matchesLegacyStructuralValue(value: unknown, schema: JsonSchema): boolean {
  if (matchesSchemaValue(value, schema)) return true;
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    return value.every((item) => matchesLegacyStructuralValue(item, schema.items!));
  }
  if (isExplicitEnvelope(value)) return false;
  const alternatives = schema.anyOf ?? schema.oneOf;
  if (!alternatives?.length || !alternatives.every(isStructuralEnvelopeSchema)) return false;
  return alternatives.some((branch) => matchesSchemaValue(value, branch.properties!.props!));
}

/** Prefer the valid contract describing the most supplied fields; retain order for ties. */
export function matchingSchemaIndex(value: unknown, schemas: readonly JsonSchema[]): number {
  let selected = -1;
  let highest = -1;
  schemas.forEach((schema, index) => {
    if (!matchesSchemaValue(value, schema)) return;
    const score = describedProperties(value, schema).size;
    if (score > highest) {
      selected = index;
      highest = score;
    }
  });
  return selected;
}

function describedProperties(value: unknown, schema: JsonSchema): Set<string> {
  const names = new Set<string>();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return names;
  for (const name of Object.keys(schema.properties ?? {})) {
    if (Object.hasOwn(value, name)) names.add(name);
  }
  for (const branch of [
    ...(schema.allOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.oneOf ?? []),
  ]) {
    if (!matchesSchemaValue(value, branch)) continue;
    for (const name of describedProperties(value, branch)) names.add(name);
  }
  return names;
}

/** Inline canonical Facadeur named-schema references while preserving union keywords. */
export function resolveJsonSchema(schema: JsonSchema, catalog?: SchemaCatalog): JsonSchema {
  const visit = (current: JsonSchema, ancestors: ReadonlySet<string>): JsonSchema => {
    const ref = current.$ref;
    if (ref?.startsWith('facadeur://schema/')) {
      const id = decodeSchemaRef(ref);
      if (!id) return structuredClone(current);
      const named = catalog?.schemas.find((entry) => entry.id === id);
      if (named && !ancestors.has(id)) {
        const next = new Set(ancestors).add(id);
        return visit(named.schema, next);
      }
      return structuredClone(current);
    }
    const result = structuredClone(current);
    for (const keyword of ['oneOf', 'anyOf', 'allOf'] as const) {
      const branches = current[keyword];
      if (branches) result[keyword] = branches.map((branch) => visit(branch, ancestors));
    }
    if (current.properties) {
      result.properties = Object.fromEntries(
        Object.entries(current.properties).map(([name, property]) => [
          name,
          visit(property, ancestors),
        ]),
      );
    }
    if (current.items) result.items = visit(current.items, ancestors);
    if (current.additionalProperties && typeof current.additionalProperties === 'object') {
      result.additionalProperties = visit(current.additionalProperties, ancestors);
    }
    return result;
  };
  return visit(schema, new Set());
}

function decodeSchemaRef(ref: string) {
  try {
    const id = decodeURIComponent(ref.slice('facadeur://schema/'.length));
    return `${'facadeur://schema/'}${encodeURIComponent(id)}` === ref ? id : undefined;
  } catch {
    return undefined;
  }
}

function isExplicitEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.hasOwn(value, 'type') &&
    Object.hasOwn(value, 'props')
  );
}

function isStructuralEnvelopeSchema(schema: JsonSchema): boolean {
  return (
    schema.type === 'object' &&
    schema.properties?.type?.const !== undefined &&
    schema.properties.props !== undefined &&
    schema.required?.includes('type') === true &&
    schema.required.includes('props')
  );
}
