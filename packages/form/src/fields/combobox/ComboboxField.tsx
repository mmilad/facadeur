import React from 'react';
import { TextField } from '../text';
import type { ComboboxFieldProps } from './types';

export function ComboboxField({
  id,
  name,
  label,
  value,
  options,
  disabled,
  onChange,
}: ComboboxFieldProps) {
  return (
    <TextField
      id={id}
      name={name}
      label={label}
      value={value}
      suggestions={options}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
