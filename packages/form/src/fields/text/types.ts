import type { InputHTMLAttributes } from 'react';

export type TextFieldConfig = {
  name: string;
  label: string;
  type: 'text';
  placeholder?: string;
  disabled?: boolean;
};

export type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'id' | 'name' | 'value' | 'onChange'
> & {
  id: string;
  name?: string;
  label?: string;
  type?: InputHTMLAttributes<HTMLInputElement>['type'];
  value: string;
  suggestions?: readonly { value: string; label?: string }[];
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
};
