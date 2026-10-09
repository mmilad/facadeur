import React from 'react';
import styles from './ComboboxField.module.css';
import type { ComboboxFieldProps } from './types';

export function ComboboxField({
  id,
  name,
  value,
  options,
  disabled,
  onChange,
}: ComboboxFieldProps) {
  const listId = `${id}-options`;

  return (
    <div className={styles.root}>
      <input
        className={styles.input}
        id={id}
        name={name}
        type="text"
        list={listId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
    </div>
  );
}
