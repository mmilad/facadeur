import {
  ID_PATTERN,
  type FieldDefinition,
  type FieldType,
  type FieldValue,
  type VariantAxis,
} from '@facadeur/core';
import { parseFieldValue } from './field-values.js';

/** Types the editor can create. `richText` stays in the schema for later. */
export const creatableFieldTypes = [
  'text',
  'image',
  'link',
  'boolean',
  'enum',
  'number',
  'token',
  'array',
  'object',
] as const satisfies readonly FieldType[];

export type FieldItems = NonNullable<FieldDefinition['items']>;

export function splitList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function fieldDefinitionFromDraft(input: {
  name: string;
  type: FieldType;
  rawDefault?: string;
  optionsText: string;
  booleanDefault?: boolean;
  required?: boolean;
}): FieldDefinition {
  const name = input.name.trim();
  assertFieldName(name);
  if (input.type === 'richText') throw new Error('Rich text is not available yet');
  const field: FieldDefinition = {
    name,
    type: input.type,
    ...(input.required ? { required: true } : {}),
  };
  if (input.type === 'array') field.items = { type: 'text' };
  if (input.type === 'object') field.items = { type: 'object', fields: [] };
  if (input.type === 'enum') {
    const options = splitList(input.optionsText);
    if (!options.length) throw new Error('An enum field needs at least one option');
    if (new Set(options).size !== options.length) throw new Error('Enum options must be unique');
    field.options = options;
  }
  const fallback =
    input.rawDefault !== undefined || input.booleanDefault !== undefined
      ? draftDefault(field, input.rawDefault ?? '', input.booleanDefault ?? false)
      : undefined;
  if (fallback !== undefined) field.default = fallback;
  return field;
}

export function retargetField(field: FieldDefinition, type: FieldType): FieldDefinition {
  if (type === field.type) return cloneField(field);
  if (type === 'richText') throw new Error('Rich text is not available yet');
  const next: FieldDefinition = {
    name: field.name,
    type,
    ...(field.required ? { required: true } : {}),
  };
  if (type === 'enum') {
    const seed = typeof field.default === 'string' && field.default ? field.default : 'value';
    next.options = [seed];
  } else if (type === 'array') {
    next.items = { type: 'text' };
  } else if (type === 'object') {
    next.items = { type: 'object', fields: [] };
  }
  return next;
}

export function replaceFieldItems(
  field: FieldDefinition,
  items: FieldItems | undefined,
): FieldDefinition {
  const next = cloneField(field);
  if (items === undefined) delete next.items;
  else next.items = cloneItems(items);
  return next;
}

export function replaceFieldDefault(field: FieldDefinition, raw: string): FieldDefinition {
  const next = cloneField(field);
  const fallback = draftDefault(next, raw, raw === 'true');
  if (fallback === undefined) delete next.default;
  else next.default = fallback;
  return next;
}

export function replaceFieldOptions(field: FieldDefinition, optionsText: string): FieldDefinition {
  const options = splitList(optionsText);
  if (!options.length) throw new Error('An enum field needs at least one option');
  if (new Set(options).size !== options.length) throw new Error('Enum options must be unique');
  const next = cloneField(field);
  next.options = options;
  if (typeof next.default === 'string' && !options.includes(next.default)) delete next.default;
  return next;
}

export function replaceFieldItemOptions(
  field: FieldDefinition,
  optionsText: string,
): FieldDefinition {
  if (field.type !== 'array' || field.items?.type !== 'enum') {
    throw new Error('Only enum array items can have options');
  }
  const options = splitList(optionsText);
  if (!options.length) throw new Error('Enum item fields need at least one option');
  if (new Set(options).size !== options.length) {
    throw new Error('Enum item options must be unique');
  }
  const next = cloneField(field);
  next.items = { ...next.items!, options };
  return next;
}

export function variantAxisFromDraft(input: {
  name: string;
  valuesText: string;
  fallback?: string;
}): VariantAxis {
  const name = input.name.trim();
  assertFieldName(name);
  const values = splitList(input.valuesText);
  if (!values.length) throw new Error('A variant axis needs at least one value');
  if (new Set(values).size !== values.length) throw new Error('Variant values must be unique');
  const axis: VariantAxis = { name, values };
  if (input.fallback && values.includes(input.fallback)) axis.default = input.fallback;
  return axis;
}

function draftDefault(
  field: FieldDefinition,
  raw: string,
  booleanDefault: boolean,
): FieldValue | undefined {
  if (field.type === 'boolean') return booleanDefault;
  return parseFieldValue(field, raw, { trimStrings: true, empty: 'undefined' });
}

function cloneField(field: FieldDefinition): FieldDefinition {
  return {
    name: field.name,
    type: field.type,
    ...(field.required !== undefined ? { required: field.required } : {}),
    ...(field.options ? { options: [...field.options] } : {}),
    ...(field.default !== undefined ? { default: field.default } : {}),
    ...(field.items ? { items: cloneItems(field.items) } : {}),
  };
}

function cloneItems(items: FieldItems): FieldItems {
  return {
    type: items.type,
    ...(items.options ? { options: [...items.options] } : {}),
    ...(items.fields ? { fields: items.fields.map(cloneField) } : {}),
  };
}

function assertFieldName(name: string): void {
  if (!ID_PATTERN.test(name)) {
    throw new Error('Names start with a letter and use letters, numbers, _ or -');
  }
}
