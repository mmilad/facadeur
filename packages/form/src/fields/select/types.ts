import type { SelectHTMLAttributes } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectFieldConfig = {
  name: string;
  label: string;
  type: 'select';
  options?: readonly SelectOption[];
  optionsFrom?: {
    arg: string;
    values: Readonly<Record<string, readonly SelectOption[]>>;
  };
  disabled?: boolean;
};

export type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'name' | 'value' | 'onChange'
> & {
  id: string;
  name?: string;
  options: readonly SelectOption[];
  value: string;
  placeholder?: string;
  invalid?: boolean;
  onChange: (next: string) => void;
};
