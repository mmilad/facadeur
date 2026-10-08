export const STORYBOOK_SCHEMA_FORM_PARAMETER = 'storybookSchemaForm';

export interface SchemaFormOption {
  readonly value: string;
  readonly label: string;
}

interface SchemaFieldBase {
  readonly name: string;
  readonly label: string;
}

export interface TextSchemaField extends SchemaFieldBase {
  readonly type: 'text';
  readonly placeholder?: string;
}

export interface NumberSchemaField extends SchemaFieldBase {
  readonly type: 'number';
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface BooleanSchemaField extends SchemaFieldBase {
  readonly type: 'boolean';
}

export interface SelectSchemaField extends SchemaFieldBase {
  readonly type: 'select';
  readonly options?: readonly SchemaFormOption[];
  readonly optionsFrom?: {
    readonly arg: string;
    readonly values: Readonly<Record<string, readonly SchemaFormOption[]>>;
  };
}

export type RepeaterItemField =
  | TextSchemaField
  | NumberSchemaField
  | BooleanSchemaField
  | (SchemaFieldBase & {
      readonly type: 'select';
      readonly options: readonly SchemaFormOption[];
    });

export interface RepeaterSchemaField extends SchemaFieldBase {
  readonly type: 'repeater';
  readonly itemLabel: string;
  readonly itemFields: readonly RepeaterItemField[];
  readonly createItem: Readonly<Record<string, string | number | boolean>>;
}

export type SchemaFormField =
  | TextSchemaField
  | NumberSchemaField
  | BooleanSchemaField
  | SelectSchemaField
  | RepeaterSchemaField;

export interface StorybookSchemaFormConfig {
  readonly fields: readonly SchemaFormField[];
}
