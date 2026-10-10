import React from 'react';
import styles from './SelectField.module.css';
import type { SelectFieldProps } from './types';

export function SelectField({
  id,
  name,
  value,
  options,
  placeholder,
  disabled,
  invalid,
  className,
  onChange,
  ...selectProps
}: SelectFieldProps) {
  return (
    <select
      {...selectProps}
      className={[styles.select, className].filter(Boolean).join(' ')}
      id={id}
      name={name}
      value={value}
      disabled={disabled || options.length === 0}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {placeholder ? (
        <option value="" disabled={options.length > 0}>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
