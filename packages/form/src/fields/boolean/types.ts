import type { InputHTMLAttributes } from 'react';

export type BooleanFieldConfig = {
  name: string;
  label: string;
  type: 'boolean';
  disabled?: boolean;
};

export type BooleanFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'type' | 'checked' | 'value' | 'onChange'
> & {
  id: string;
  name?: string;
  value: boolean;
  invalid?: boolean;
  onChange: (next: boolean) => void;
};
