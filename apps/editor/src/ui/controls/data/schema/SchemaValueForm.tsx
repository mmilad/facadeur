import { primaryJsonSchemaType, type FieldValue, type JsonSchema } from '@facadeur/core';
import { JsonSchemaContractEditor } from '../../../schema/JsonSchemaContractEditor';
import { StructuralSchemaValueForm } from './StructuralSchemaValueForm';

function hasStructuralCases(schema: JsonSchema): boolean {
  const alternatives = schema.oneOf ?? schema.anyOf;
  if (!alternatives?.length) return false;
  return alternatives.some(
    (branch) =>
      typeof branch.properties?.type?.const === 'string' && branch.properties?.props !== undefined,
  );
}

function usesStructuralEditor(schema: JsonSchema): boolean {
  if (hasStructuralCases(schema)) return true;
  const type = primaryJsonSchemaType(schema);
  if (type === 'object' || schema.properties) return true;
  return type === 'array' && hasNestedObject(schema.items, true);
}

function hasNestedObject(schema: JsonSchema | JsonSchema[] | undefined, nested = false): boolean {
  if (!schema || Array.isArray(schema)) return false;
  if (hasStructuralCases(schema)) return true;
  const type = primaryJsonSchemaType(schema);
  if (nested && (type === 'object' || schema.properties)) return true;
  if (
    schema.properties &&
    Object.values(schema.properties).some((property) => hasNestedObject(property, true))
  ) {
    return true;
  }
  return type === 'array' && hasNestedObject(schema.items, true);
}

/** Route simple contract samples through the shared JSON Schema form and structural unions to their dedicated editor. */
export function SchemaValueForm({
  schema,
  value,
  label,
  onChange,
  disabled = false,
}: {
  schema: JsonSchema;
  value: FieldValue | undefined;
  label: string;
  onChange: (value: FieldValue) => void;
  disabled?: boolean;
}) {
  const editor = usesStructuralEditor(schema) ? (
    <StructuralSchemaValueForm schema={schema} value={value} label={label} onChange={onChange} />
  ) : (
    <JsonSchemaContractEditor
      schema={schema}
      value={value}
      label={label}
      onChange={onChange}
      showAdvanced={schemaUsesAdvancedEditor(schema)}
    />
  );
  return disabled ? (
    <fieldset
      disabled
      aria-disabled="true"
      style={{ border: 0, margin: 0, minWidth: 0, opacity: 0.55, padding: 0 }}
    >
      {editor}
    </fieldset>
  ) : (
    editor
  );
}

function schemaUsesAdvancedEditor(schema: JsonSchema): boolean {
  if (schema.properties || schema.items) return true;
  const type = primaryJsonSchemaType(schema);
  return type === 'object' || type === 'array';
}
