export type TextAreaFieldConfig = {
  name: string;
  label: string;
  type: 'textarea';
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
};

import type { TextareaHTMLAttributes } from 'react';

export type TextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'id' | 'name' | 'value' | 'onChange'
> & {
  id: string;
  name?: string;
  value: string;
  invalid?: boolean;
  onCommit?: (next: string) => void;
  onChange: (next: string) => void;
};
