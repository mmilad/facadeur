import type { InputHTMLAttributes } from 'react';

export type SearchFieldConfig = {
  name: string;
  label: string;
  type: 'search';
  placeholder?: string;
  disabled?: boolean;
};

export type SearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'value' | 'type' | 'onChange'
> & {
  id: string;
  name?: string;
  value: string;
  invalid?: boolean;
  onChange: (next: string) => void;
};
