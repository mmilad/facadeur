import type { InputHTMLAttributes } from 'react';

export type NumberFieldConfig = {
  name: string;
  label: string;
  type: 'number';
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
};

export type NumberFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'type' | 'value' | 'onChange' | 'onBlur'
> & {
  id: string;
  name?: string;
  value: number | '';
  onChange: (next: number | '') => void;
  onCommit?: (next: number | '') => void;
  invalid?: boolean;
};
