import React from 'react';
import styles from './SearchField.module.css';
import type { SearchFieldProps } from './types';

export function SearchField({
  id,
  name,
  value,
  placeholder,
  disabled,
  className,
  invalid,
  onChange,
  ...inputProps
}: SearchFieldProps) {
  return (
    <input
      {...inputProps}
      className={[styles.input, className].filter(Boolean).join(' ')}
      id={id}
      name={name}
      type="search"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}
