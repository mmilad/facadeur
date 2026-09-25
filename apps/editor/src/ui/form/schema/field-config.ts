import type { SelectOption } from '../types/options.js';

export type FieldConfigBase = {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
};

export type TextFieldConfig = FieldConfigBase & {
  type: 'text' | 'textarea' | 'number' | 'search';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type ColorFieldConfig = FieldConfigBase & {
  type: 'color';
};

export type SelectFieldConfig = FieldConfigBase & {
  type: 'select' | 'combobox';
  options: SelectOption[];
  placeholder?: string;
};

export type ToggleFieldConfig = FieldConfigBase & {
  type: 'toggle' | 'checkbox';
};

export type ArrayFieldConfig = FieldConfigBase & {
  type: 'array';
  item: FieldConfig | FieldConfig[];
  defaultItem?: unknown;
};

export type RecordFieldConfig = FieldConfigBase & {
  type: 'record';
  keyLabel?: string;
  valueLabel?: string;
};

export type FieldConfig =
  | TextFieldConfig
  | ColorFieldConfig
  | SelectFieldConfig
  | ToggleFieldConfig
  | ArrayFieldConfig
  | RecordFieldConfig;

export type FieldGroupConfig = {
  type: 'section';
  title?: string;
  fields: FieldConfig[];
};
