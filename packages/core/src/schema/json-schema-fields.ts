import type { FieldDefinition, FieldValue, JsonSchema } from './document';

/** Derive editor field definitions from a JSON Schema object contract. */
export function fieldsFromJsonSchema(schema: JsonSchema): FieldDefinition[] {
  const branches = schema.anyOf ?? schema.oneOf ?? schema.allOf ?? [schema];
  const names = [...new Set(branches.flatMap((branch) => Object.keys(branch.properties ?? {})))];
  return names.map((name) => {
    const branchFields = branches.flatMap((branch) => {
      const property = branch.properties?.[name];
      return property ? [property] : [];
    });
    const propertySchema = branchFields.length === 1 ? branchFields[0]! : { anyOf: branchFields };
    const required = branches.every((branch) => branch.required?.includes(name));
    return fieldFromJsonSchemaProperty(name, propertySchema, required);
  });
}

function fieldFromJsonSchemaProperty(
  name: string,
  schema: JsonSchema,
  required: boolean,
): FieldDefinition {
  const branches = schema.anyOf ?? schema.oneOf ?? schema.allOf ?? [schema];
  const types = branches.map((branch) =>
    Array.isArray(branch.type) ? branch.type[0] : branch.type,
  );
  const enumValues = branches.flatMap(
    (branch) => branch.enum ?? ('const' in branch ? [branch.const] : []),
  );
  const type: FieldDefinition['type'] = enumValues.length
    ? 'enum'
    : types.every((entry) => entry === 'number' || entry === 'integer')
      ? 'number'
      : types.every((entry) => entry === 'boolean')
        ? 'boolean'
        : types.every((entry) => entry === 'array')
          ? 'array'
          : types.every((entry) => entry === 'object' || entry === undefined) ||
              branches.every((branch) => Boolean(branch.properties))
            ? 'object'
            : 'text';
  const options = [
    ...new Set(enumValues.filter((entry): entry is string => typeof entry === 'string')),
  ];
  const itemsSchema = type === 'array' ? schema.items : undefined;
  const nestedFields = type === 'object' ? fieldsFromJsonSchema(schema) : [];
  return {
    name,
    type,
    ...(required ? { required: true } : {}),
    schema,
    ...(options.length ? { options } : {}),
    ...(schema.default !== undefined && isFieldValue(schema.default)
      ? { default: schema.default }
      : {}),
    ...(type === 'object' && nestedFields.length
      ? { items: { type: 'object' as const, fields: nestedFields, schema } }
      : type === 'array' && itemsSchema && !Array.isArray(itemsSchema)
        ? { items: { type: fieldTypeForSchema(itemsSchema), schema: itemsSchema } }
        : {}),
  };
}

function fieldTypeForSchema(schema: JsonSchema): FieldDefinition['type'] {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type === 'number' || type === 'integer') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'array') return 'array';
  if (type === 'object' || schema.properties) return 'object';
  if (schema.enum || 'const' in schema) return 'enum';
  return 'text';
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFieldValue);
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((item) => isFieldValue(item))
  );
}
