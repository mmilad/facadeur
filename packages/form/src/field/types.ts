import type { TextFieldConfig } from '../fields/text';

export type FormFieldConfig = TextFieldConfig;

export type FormFieldProps = {
  field: FormFieldConfig;
  id: string;
  layout: 'stacked' | 'horizontal';
  value: unknown;
  onChange: (next: string) => void;
};
