import { selectStructuralChild, type FieldValue, type JsonSchema } from '@facadeur/core';
import { CodegenError } from './names';

/** Convert legacy preview samples once during generation; emitted React only sees tagged data. */
export function typedStoryValue(value: FieldValue, schema: JsonSchema | undefined): FieldValue {
  if (!schema) return value;
  const branches = schema.anyOf ?? schema.oneOf ?? [];
  const candidates = branches.flatMap((branch) => {
    const caseValue = branch.properties?.type?.const;
    const payloadSchema = branch.properties?.props;
    return typeof caseValue === 'string' && payloadSchema
      ? [{ caseValue, payloadSchema, schema: branch }]
      : [];
  });
  if (candidates.length === branches.length && candidates.length) {
    const selection = selectStructuralChild(
      value,
      candidates.map((candidate) => ({
        ...candidate,
        payloadSchema: storyInputSchema(candidate.payloadSchema),
      })),
    );
    if (!selection)
      throw new CodegenError('Story sample does not match any configured structural case');
    return {
      type: selection.caseValue,
      props: typedStoryValue(selection.props, candidates[selection.index]!.payloadSchema),
    };
  }
  if (Array.isArray(value)) return value.map((item) => typedStoryValue(item, schema.items));
  if (value !== null && typeof value === 'object') {
    const properties: Record<string, JsonSchema> = {};
    for (const part of [schema, ...(schema.allOf ?? [])])
      Object.assign(properties, part.properties);
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, typedStoryValue(item, properties[name])]),
    );
  }
  return value;
}

/** Permit legacy nested envelopes while choosing the outer branch at generation time. */
function storyInputSchema(schema: JsonSchema): JsonSchema {
  const result: JsonSchema = { ...schema };
  if (schema.properties)
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([name, property]) => [
        name,
        storyInputSchema(property),
      ]),
    );
  if (schema.items) result.items = storyInputSchema(schema.items);
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    if (schema[key]) result[key] = schema[key].map(storyInputSchema);
  }
  const branches = schema.anyOf ?? schema.oneOf;
  if (
    branches?.length &&
    branches.every(
      (branch) => typeof branch.properties?.type?.const === 'string' && branch.properties.props,
    )
  ) {
    delete result.oneOf;
    result.anyOf = [
      ...branches.map(storyInputSchema),
      ...branches.map((branch) => storyInputSchema(branch.properties!.props!)),
    ];
  }
  return result;
}
