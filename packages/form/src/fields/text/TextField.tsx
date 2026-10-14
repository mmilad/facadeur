import React, { type KeyboardEvent } from 'react';
import { useStringDraft } from '../shared/use-string-draft';
import styles from './TextField.module.css';
import type { TextFieldProps } from './types';

export function TextField({
  id,
  name,
  label,
  type = 'text',
  value,
  placeholder,
  disabled,
  className,
  suggestions,
  onChange,
  onCommit,
  onBlur: onBlurProp,
  onKeyDown: onKeyDownProp,
  ...inputProps
}: TextFieldProps) {
  const [draft, setDraft] = useStringDraft(value);
  const listId = suggestions?.length ? `${id}-suggestions` : undefined;
  return (
    <>
      <input
        {...inputProps}
        className={[styles.input, className].filter(Boolean).join(' ')}
        id={id}
        name={name}
        type={type}
        aria-label={label ?? inputProps['aria-label']}
        list={listId}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setDraft(next);
          onChange(next);
        }}
        onBlur={(event) => {
          onBlurProp?.(event);
          onCommit?.(draft);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          onKeyDownProp?.(event);
          if (event.defaultPrevented) return;
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      {listId ? (
        <datalist id={listId}>
          {suggestions?.map((suggestion) => (
            <option key={suggestion.value} value={suggestion.value} label={suggestion.label} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}
