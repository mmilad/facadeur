import React from 'react';
import styles from './SelectField.module.css';
import type { SelectFieldProps } from './types';

export function SelectField({ id, name, value, options, disabled, onChange }: SelectFieldProps) {
  return (
    <select
      className={styles.select}
      id={id}
      name={name}
      value={value}
      disabled={disabled || options.length === 0}
      onChange={(event) => onChange(event.currentTarget.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
