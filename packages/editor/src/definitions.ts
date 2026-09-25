import {
  ID_PATTERN,
  type FieldDefinition,
  type FieldType,
  type FieldValue,
  type VariantAxis,
} from '@facadeur/core';

/** Types the editor can create. `richText` stays in the schema for later. */
export const creatableFieldTypes = [
  'text',
  'image',
  'link',
  'boolean',
  'enum',
  'number',
  'token',
] as const satisfies readonly FieldType[];

export function splitList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function fieldDefinitionFromDraft(input: {
  name: string;
  type: FieldType;
  rawDefault: string;
  optionsText: string;
  booleanDefault: boolean;
}): FieldDefinition {
  const name = input.name.trim();
  assertFieldName(name);
  if (input.type === 'richText') throw new Error('Rich text is not available yet');
  const field: FieldDefinition = { name, type: input.type };
  if (input.type === 'enum') {
    const options = splitList(input.optionsText);
    if (!options.length) throw new Error('An enum field needs at least one option');
    if (new Set(options).size !== options.length) throw new Error('Enum options must be unique');
    field.options = options;
  }
  const fallback = draftDefault(field, input.rawDefault, input.booleanDefault);
  if (fallback !== undefined) field.default = fallback;
  return field;
}

export function retargetField(field: FieldDefinition, type: FieldType): FieldDefinition {
  if (type === field.type) return cloneField(field);
  if (type === 'richText') throw new Error('Rich text is not available yet');
  const next: FieldDefinition = { name: field.name, type };
  if (type === 'enum') {
    const seed = typeof field.default === 'string' && field.default ? field.default : 'value';
    next.options = [seed];
    next.default = seed;
  } else if (type === 'boolean') {
    next.default = false;
  }
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
  const text = raw.trim();
  if (!text) return undefined;
  if (field.type === 'number') {
    const value = Number(text);
    if (!Number.isFinite(value)) throw new Error(`${field.name} must be a number`);
    return value;
  }
  if (field.type === 'enum' && !field.options?.includes(text)) {
    throw new Error(`${field.name} must be one of ${field.options?.join(', ')}`);
  }
  return text;
}

function cloneField(field: FieldDefinition): FieldDefinition {
  return {
    name: field.name,
    type: field.type,
    ...(field.options ? { options: [...field.options] } : {}),
    ...(field.default !== undefined ? { default: field.default } : {}),
  };
}

function assertFieldName(name: string): void {
  if (!ID_PATTERN.test(name)) {
    throw new Error('Names start with a letter and use letters, numbers, _ or -');
  }
}
