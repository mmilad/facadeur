import React from 'react';
import styles from './NumberField.module.css';
import type { NumberFieldProps } from './types';

export function NumberField({
  id,
  name,
  value,
  placeholder,
  disabled,
  min,
  max,
  step,
  onChange,
}: NumberFieldProps) {
  return (
    <input
      className={styles.input}
      id={id}
      name={name}
      type="number"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        onChange(raw === '' ? '' : event.currentTarget.valueAsNumber);
      }}
    />
  );
}
