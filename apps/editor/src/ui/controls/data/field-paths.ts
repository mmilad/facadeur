import type { FieldDefinition } from '@facadeur/core';
import { fieldDisplayLabel } from './field-label.js';
export type PathOption = { value: string; label: string; field: FieldDefinition };
export function fieldPathOptions(fields: FieldDefinition[], prefix = ''): PathOption[] {
  return fields.flatMap((field) => {
    const value = prefix ? `${prefix}.${field.name}` : field.name;
    const option: PathOption = { value, label: fieldDisplayLabel(value), field };
    const nested =
      field.type === 'object' && field.items?.fields
        ? fieldPathOptions(field.items.fields, value)
        : [];
    return [option, ...nested];
  });
}

export function findField(paths: PathOption[], path: string): FieldDefinition | undefined {
  return paths.find((option) => option.value === path)?.field;
}

export function isScalarField(field: FieldDefinition): boolean {
  return field.type !== 'array' && field.type !== 'object';
}

export function withMissingOption(options: PathOption[], value: string): PathOption[] {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ value, label: `Missing: ${value}`, field: { name: value, type: 'text' } }, ...options];
}
