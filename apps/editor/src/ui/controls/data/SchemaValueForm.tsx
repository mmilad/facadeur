import type { FieldValue, JsonSchema } from '@facadeur/core';
import { JsonSchemaContractEditor } from '../../schema/JsonSchemaContractEditor';
import { StructuralSchemaValueForm } from './StructuralSchemaValueForm';

function hasStructuralCases(schema: JsonSchema): boolean {
  const alternatives = schema.oneOf ?? schema.anyOf;
  if (!alternatives?.length) return false;
  return alternatives.some(
    (branch) =>
      typeof branch.properties?.type?.const === 'string' &&
      branch.properties?.props !== undefined,
  );
}

function usesStructuralEditor(schema: JsonSchema): boolean {
  if (hasStructuralCases(schema)) return true;
  if (schema.properties) {
    return Object.values(schema.properties).some(
      (property) => hasStructuralCases(property) || hasStructuralArrayItems(property),
    );
  }
  return hasStructuralArrayItems(schema);
}

function hasStructuralArrayItems(schema: JsonSchema): boolean {
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (type !== 'array' && !schema.items) return false;
  const items = schema.items;
  if (!items || Array.isArray(items)) return false;
  return hasStructuralCases(items);
}

/** Route simple contract samples through the shared JSON Schema form; keep structural unions on the legacy editor. */
export function SchemaValueForm({
  schema,
  value,
  label,
  onChange,
}: {
  schema: JsonSchema;
  value: FieldValue | undefined;
  label: string;
  onChange: (value: FieldValue) => void;
}) {
  if (usesStructuralEditor(schema)) {
    return (
      <StructuralSchemaValueForm
        schema={schema}
        value={value}
        label={label}
        onChange={onChange}
      />
    );
  }
  return (
    <JsonSchemaContractEditor
      schema={schema}
      value={value}
      label={label}
      onChange={onChange}
      showAdvanced={schemaUsesAdvancedEditor(schema)}
    />
  );
}

function schemaUsesAdvancedEditor(schema: JsonSchema): boolean {
  if (schema.properties || schema.items) return true;
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  return type === 'object' || type === 'array';
}
