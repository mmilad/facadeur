import React, { useEffect, useState } from 'react';
import styles from './TextField.module.css';
import type { TextFieldProps } from './types';

export function TextField({
  id,
  name,
  label,
  value,
  placeholder,
  disabled,
  className,
  suggestions,
  onChange,
  onCommit,
}: TextFieldProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const listId = suggestions?.length ? `${id}-suggestions` : undefined;
  return (
    <>
      <input
        className={[styles.input, className].filter(Boolean).join(' ')}
        id={id}
        name={name}
        type="text"
        aria-label={label}
        list={listId}
        value={draft}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setDraft(next);
          onChange(next);
        }}
        onBlur={() => onCommit?.(draft)}
        onKeyDown={(event) => {
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
