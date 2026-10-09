import type { FormChangeMeta } from '../../form/types';
import type { FormFieldConfig } from '../../field';
import type { SelectOption } from '../select';

export type ObjectFieldConfig = {
  name: string;
  label: string;
  type: 'object';
  fields: readonly FormFieldConfig[];
};

export type ObjectFieldProps = {
  label: string;
  fields: readonly FormFieldConfig[];
  value: Record<string, unknown>;
  bindOptions?: readonly SelectOption[];
  onChange: (next: Record<string, unknown>, meta: FormChangeMeta) => void;
};
