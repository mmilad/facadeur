import type { FormFieldConfig } from '@facadeur/form';

export const STORYBOOK_SCHEMA_FORM_PARAMETER = 'storybookSchemaForm';

export interface StorybookSchemaFormConfig {
  readonly fields: readonly FormFieldConfig[];
}
