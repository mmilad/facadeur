import React from 'react';
import styles from './BooleanField.module.css';
import type { BooleanFieldProps } from './types';

export function BooleanField({ id, name, value, disabled, onChange }: BooleanFieldProps) {
  return (
    <input
      className={styles.checkbox}
      id={id}
      name={name}
      type="checkbox"
      checked={value}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.checked)}
    />
  );
}
