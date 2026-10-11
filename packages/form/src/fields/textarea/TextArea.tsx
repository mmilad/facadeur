import React from 'react';
import { useStringDraft } from '../shared/use-string-draft';
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
  const [draft, setDraft] = useStringDraft(value);

  return (
    <textarea
      {...textareaProps}
      className={[styles.textarea, className].filter(Boolean).join(' ')}
      id={id}
      name={name}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      rows={rows}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setDraft(next);
        onChange(next);
      }}
      onBlur={(event) => {
        onBlurProp?.(event);
        onCommit?.(draft);
      }}
    />
  );
}
