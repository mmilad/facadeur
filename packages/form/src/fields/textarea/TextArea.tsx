import React from 'react';
import styles from './TextArea.module.css';
import type { TextAreaProps } from './types';

export function TextArea({
  id,
  name,
  value,
  placeholder,
  disabled,
  invalid,
  className,
  rows,
  onChange,
  onCommit,
  onBlur: onBlurProp,
  ...textareaProps
}: TextAreaProps) {
  return (
    <textarea
      {...textareaProps}
      className={[styles.textarea, className].filter(Boolean).join(' ')}
      id={id}
      name={name}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      rows={rows}
      onChange={(event) => onChange(event.currentTarget.value)}
      onBlur={(event) => {
        onBlurProp?.(event);
        onCommit?.(event.currentTarget.value);
      }}
    />
  );
}
