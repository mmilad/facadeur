import type { SelectOption } from '@facadeur/form';

export type SchemaFieldKey =
  | 'name'
  | 'title'
  | 'description'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'format'
  | 'kind'
  | 'required'
  | 'enumValues'
  | 'reference'
  | 'referenceTarget'
  | 'itemKind'
  | 'itemReference'
  | 'query'
  | 'displayName';

type FieldPresetOptions = {
  title?: string;
  options?: readonly SelectOption[];
  placeholder?: string;
  preselected?: string;
};

type FieldPreset = {
  name: SchemaFieldKey;
  title: string;
  options?: readonly SelectOption[];
  placeholder?: string;
  preselected?: string;
};

const defaultPresets: Record<SchemaFieldKey, Omit<FieldPreset, 'options' | 'placeholder'>> = {
  name: { name: 'name', title: 'Field name' },
  title: { name: 'title', title: 'Title' },
  description: { name: 'description', title: 'Description' },
  minLength: { name: 'minLength', title: 'Minimum length' },
  maxLength: { name: 'maxLength', title: 'Maximum length' },
  pattern: { name: 'pattern', title: 'Pattern (regex)' },
  format: { name: 'format', title: 'Format' },
  kind: { name: 'kind', title: 'Type', preselected: 'string' },
  required: { name: 'required', title: 'Required' },
  enumValues: { name: 'enumValues', title: 'Allowed values' },
  reference: { name: 'reference', title: 'Reference' },
  referenceTarget: { name: 'referenceTarget', title: 'Reference target' },
  itemKind: { name: 'itemKind', title: 'Item type', preselected: 'string' },
  itemReference: { name: 'itemReference', title: 'Item reference' },
  query: { name: 'query', title: 'Search schemas' },
  displayName: { name: 'displayName', title: 'Display name' },
};

export function getField(key: SchemaFieldKey, options: FieldPresetOptions = {}) {
  const preset: FieldPreset = { ...defaultPresets[key], ...options };

  switch (key) {
    case 'kind':
    case 'itemKind':
    case 'reference':
    case 'referenceTarget':
    case 'itemReference':
      return {
        field: {
          name: preset.name,
          label: preset.title,
          type: 'select' as const,
          options: preset.options ?? [],
          placeholder: preset.placeholder,
        },
        preselected: preset.preselected,
      };
    case 'required':
      return {
        field: { name: preset.name, label: preset.title, type: 'boolean' as const },
      };
    case 'minLength':
    case 'maxLength':
      return {
        field: {
          name: preset.name,
          label: preset.title,
          type: 'number' as const,
          min: 0,
          step: 1,
        },
      };
    case 'enumValues':
      return {
        field: {
          name: preset.name,
          label: preset.title,
          type: 'chips' as const,
          placeholder: preset.placeholder,
        },
      };
    case 'query':
      return {
        field: {
          name: preset.name,
          label: preset.title,
          type: 'search' as const,
          placeholder: preset.placeholder,
        },
      };
    case 'name':
    case 'title':
    case 'description':
    case 'pattern':
    case 'format':
    case 'displayName':
      return {
        field: {
          name: preset.name,
          label: preset.title,
          type: 'text' as const,
          placeholder: preset.placeholder,
        },
      };
  }
}

export function fieldConfig(key: SchemaFieldKey, options: FieldPresetOptions = {}) {
  return getField(key, options).field;
}
