import type {
  BooleanFieldConfig,
  FormFieldConfig,
  NumberFieldConfig,
  RepeaterFieldConfig,
  SelectFieldConfig,
  SelectOption,
  TextFieldConfig,
} from '@facadeur/form';

export const STORYBOOK_SCHEMA_FORM_PARAMETER = 'storybookSchemaForm';

export type SchemaFormOption = SelectOption;
export type TextSchemaField = TextFieldConfig;
export type NumberSchemaField = NumberFieldConfig;
export type BooleanSchemaField = BooleanFieldConfig;
export type SelectSchemaField = SelectFieldConfig;
export type RepeaterSchemaField = RepeaterFieldConfig;
export type RepeaterItemField = FormFieldConfig;
export type SchemaFormField = FormFieldConfig;

export interface StorybookSchemaFormConfig {
  readonly fields: readonly SchemaFormField[];
}
