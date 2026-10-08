import { fieldDataSchema, type FieldDefinition, type FieldValue } from '@facadeur/core';
import { fieldDisplayLabel } from '../controls/data/field-label';
import { SchemaValueForm } from '../controls/data/SchemaValueForm';

export function JsonSchemaContractFieldEditor({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}) {
  return (
    <SchemaValueForm
      schema={fieldDataSchema(field)}
      label={fieldDisplayLabel(field.name)}
      value={value}
      onChange={onChange}
    />
  );
}
