import type {
  Binding,
  BindingTarget,
  FieldDefinition,
  FieldType,
  FieldValue,
} from '@facadeur/core';
import { creatableFieldTypes } from '../../../domain/definitions.js';

export const BINDING_TARGET_LABEL: Record<BindingTarget, string> = {
  text: 'Text',
  attribute: 'Attribute',
  style: 'Style',
  visible: 'Visibility',
  src: 'Image source',
  alt: 'Alt text',
};

export function fieldTypeOptions(field: FieldDefinition): FieldType[] {
  return creatableFieldTypes.includes(field.type as (typeof creatableFieldTypes)[number])
    ? [...creatableFieldTypes]
    : [field.type, ...creatableFieldTypes];
}

export function bindingFieldOptions(
  fields: FieldDefinition[],
  currentField: string,
): FieldDefinition[] {
  return fields.some((field) => field.name === currentField)
    ? fields
    : [{ name: currentField, type: 'text' as const }, ...fields];
}

export function patchBindingAt(
  bindings: Binding[],
  index: number,
  next: Binding | null,
): Binding[] {
  const list = [...bindings];
  if (next === null) list.splice(index, 1);
  else list[index] = next;
  return list;
}

export function defaultBinding(fields: FieldDefinition[]): Binding | null {
  const field = fields[0];
  if (!field) return null;
  return { field: field.name, target: 'text' };
}

export function bindingNeedsName(target: BindingTarget): boolean {
  return target === 'attribute' || target === 'style';
}

export function normalizeBindingTargetChange(binding: Binding, target: BindingTarget): Binding {
  const name = target === 'attribute' || target === 'style' ? (binding.name ?? 'name') : undefined;
  return { field: binding.field, target, ...(name ? { name } : {}) };
}

export function parseInstanceFieldValue(field: FieldDefinition, raw: string): FieldValue {
  if (field.type === 'number') {
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
    return value;
  }
  if (field.type === 'boolean') return raw === 'true';
  return raw;
}
