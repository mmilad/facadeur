import React from 'react';
import { AutocompleteField } from '../autocomplete/AutocompleteField';
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
    <AutocompleteField
      id={id}
      name={name}
      label={label}
      value={value}
      options={options.map((option) => ({ ...option, displayLabel: true }))}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
