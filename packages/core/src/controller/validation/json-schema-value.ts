import type { JsonSchema, SchemaCatalog } from '../../schema/document';
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
