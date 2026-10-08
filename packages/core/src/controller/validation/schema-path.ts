import type { JsonSchema } from '../../schema/document';

/** Resolve a property path once per branch, preserving alternative destination contracts. */
export function schemaAtPath(schema: JsonSchema, path: string): JsonSchema | undefined {
  if (!path) return schema;
  const [part, ...remaining] = path.split('.');
  if (!part) return undefined;
  const property = schema.properties?.[part];
  const direct = property ? schemaAtPath(property, remaining.join('.')) : undefined;
  const candidates = [
    ...(direct ? [direct] : []),
    ...[...(schema.allOf ?? []), ...(schema.oneOf ?? []), ...(schema.anyOf ?? [])].flatMap(
      (branch) => {
        const candidate = schemaAtPath(branch, path);
        return candidate ? [candidate] : [];
      },
    ),
  ];
  if (!candidates.length) return undefined;
  return candidates.length === 1 ? candidates[0] : { anyOf: candidates };
}
