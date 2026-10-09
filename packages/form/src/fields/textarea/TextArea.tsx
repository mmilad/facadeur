import React from 'react';
import styles from './TextArea.module.css';
import type { TextAreaProps } from './types';

export function TextArea({
  id,
  name,
  value,
  placeholder,
  disabled,
  rows,
  onChange,
}: TextAreaProps) {
  return (
    <textarea
      className={styles.textarea}
      id={id}
      name={name}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}
