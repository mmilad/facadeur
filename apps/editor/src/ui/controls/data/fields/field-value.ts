import type { FieldDefinition, FieldType, FieldValue } from '@facadeur/core';
import { creatableFieldTypes } from '../../../../domain/definitions';
import { parseFieldValue } from '../../../../domain/field-values';

export function fieldTypeOptions(field: FieldDefinition): FieldType[] {
  return creatableFieldTypes.includes(field.type as (typeof creatableFieldTypes)[number])
    ? [...creatableFieldTypes]
    : [field.type, ...creatableFieldTypes];
}

/** Empty overrides are removed by the control; supplied values follow the shared contract. */
export function parseInstanceFieldValue(field: FieldDefinition, raw: string): FieldValue {
  const value = parseFieldValue(field, raw, { empty: 'preserve' });
  if (value === undefined) throw new Error(`${field.name} needs a value`);
  return value;
}
