import React from 'react';
import styles from './TextField.module.css';
import type { TextFieldProps } from './types';

export function TextField({ id, name, value, placeholder, disabled, onChange }: TextFieldProps) {
  return (
    <input
      className={styles.input}
      id={id}
      name={name}
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}
