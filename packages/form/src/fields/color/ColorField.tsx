import React from 'react';
import styles from './ColorField.module.css';
import type { ColorFieldProps } from './types';

export function ColorField({ id, name, value, disabled, onChange }: ColorFieldProps) {
  return (
    <input
      className={styles.input}
      id={id}
      name={name}
      type="color"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}
