export type ColorFieldConfig = {
  name: string;
  label: string;
  type: 'color';
  disabled?: boolean;
};

import type { InputHTMLAttributes } from 'react';

export type ColorFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'value' | 'type' | 'onChange' | 'onBlur'
> & {
  id: string;
  name?: string;
  label?: string;
  value: string;
  invalid?: boolean;
  onCommit?: (next: string) => void;
  onChange: (next: string) => void;
};
