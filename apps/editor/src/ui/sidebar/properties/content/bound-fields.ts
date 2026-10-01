import type { Binding, FieldDefinition } from '@facadeur/core';

/** Document fields referenced by this node's bindings, in binding order. */
export function boundFields(
  fields: readonly FieldDefinition[],
  bindings: readonly Binding[] | null | undefined,
): FieldDefinition[] {
  const byName = new Map(fields.map((field) => [field.name, field]));
  const seen = new Set<string>();
  const result: FieldDefinition[] = [];
  for (const binding of bindings ?? []) {
    if (seen.has(binding.field)) continue;
    const field = byName.get(binding.field);
    if (!field) continue;
    seen.add(binding.field);
    result.push(field);
  }
  return result;
}
