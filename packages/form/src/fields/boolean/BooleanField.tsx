import React from 'react';
import styles from './BooleanField.module.css';
import type { BooleanFieldProps } from './types';

export function BooleanField({
  id,
  name,
  value,
  disabled,
  invalid,
  className,
  onChange,
  ...inputProps
}: BooleanFieldProps) {
  return (
    <input
      {...inputProps}
      className={[styles.checkbox, className].filter(Boolean).join(' ')}
      id={id}
      name={name}
      type="checkbox"
      checked={value}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.currentTarget.checked)}
    />
  );
}
