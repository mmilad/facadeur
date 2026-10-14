import React from 'react';
import { useStringDraft } from '../shared/use-string-draft';
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
  onCommit,
  onBlur: onBlurProp,
  ...inputProps
}: SearchFieldProps) {
  const [draft, setDraft] = useStringDraft(value);

  return (
    <input
      {...inputProps}
      className={[styles.input, className].filter(Boolean).join(' ')}
      id={id}
      name={name}
      type="search"
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setDraft(next);
        onChange(next);
      }}
      onBlur={(event) => {
        onBlurProp?.(event);
        if (draft !== value) onCommit?.(draft);
      }}
    />
  );
}
