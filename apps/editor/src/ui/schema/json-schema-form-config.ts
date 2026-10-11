import { primaryJsonSchemaType, type JsonSchema } from '@facadeur/core';
import { fieldDisplayLabel } from '../controls/data/field-label';
import type { FieldConfig, FieldGroupConfig } from '../controls/data/schema/form';
import {
  initialDraftForSchema,
  initialValueForSchema,
} from '../controls/data/schema/item-array-schema';

export function formFieldsForSchema(
  schema: JsonSchema,
  label: string,
): (FieldConfig | FieldGroupConfig)[] {
  const type = primaryJsonSchemaType(schema);
  if (type === 'array') {
    const itemSchema = schema.items ?? { type: 'string' };
    return [
      {
        type: 'array',
        name: 'items',
        label,
        item: itemFieldConfig(itemSchema),
        defaultItem: initialValueForSchema(itemSchema) ?? initialDraftForSchema(itemSchema),
        collapsibleRows: true,
      },
    ];
  }
  if (type === 'object' || schema.properties) {
    const required = new Set(schema.required ?? []);
    return Object.entries(schema.properties ?? {}).map(([name, child]) =>
      fieldConfigForSchema(child, name, fieldDisplayLabel(name), required.has(name)),
    );
  }
  return [fieldConfigForSchema(schema, 'value', label, false)];
}

export function fieldConfigForSchema(
  schema: JsonSchema,
  name: string,
  label: string,
  required = false,
): FieldConfig {
  const type = primaryJsonSchemaType(schema);
  const base = { name, label, required };
  const stringEnum = schema.enum?.filter((entry): entry is string => typeof entry === 'string');
  if (stringEnum?.length) {
    return {
      ...base,
      type: 'select',
      options: stringEnum.map((value) => ({ value, label: value })),
    };
  }
  if (type === 'boolean') return { ...base, type: 'toggle' };
  if (type === 'integer' || type === 'number') {
    return {
      ...base,
      type: 'number',
      min: typeof schema.minimum === 'number' ? schema.minimum : undefined,
      max: typeof schema.maximum === 'number' ? schema.maximum : undefined,
      step:
        typeof schema.multipleOf === 'number'
          ? schema.multipleOf
          : type === 'integer'
            ? 1
            : undefined,
    };
  }
  if (type === 'array') {
    const itemSchema = schema.items ?? { type: 'string' };
    return {
      ...base,
      type: 'array',
      item: itemFieldConfig(itemSchema),
      defaultItem: initialValueForSchema(itemSchema) ?? initialDraftForSchema(itemSchema),
      collapsibleRows: true,
    };
  }
  return { ...base, type: 'text' };
}

function itemFieldConfig(itemSchema: JsonSchema): FieldConfig | FieldConfig[] {
  const itemType = primaryJsonSchemaType(itemSchema);
  if (itemType === 'object' || itemSchema.properties) {
    const requiredNames = new Set(itemSchema.required ?? []);
    return Object.entries(itemSchema.properties ?? {}).map(([prop, child]) =>
      fieldConfigForSchema(child, prop, fieldDisplayLabel(prop), requiredNames.has(prop)),
    );
  }
  return fieldConfigForSchema(itemSchema, 'item', fieldDisplayLabel('item'));
}
