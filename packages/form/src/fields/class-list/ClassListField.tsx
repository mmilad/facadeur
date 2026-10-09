import React, { useId, useState } from 'react';
import styles from './ClassListField.module.css';
import type { ClassListFieldProps } from './types';

export function ClassListField({
  id,
  value,
  suggestions = [],
  disabled,
  onChange,
}: ClassListFieldProps) {
  const listId = useId();
  const [draft, setDraft] = useState('');
  function commit() {
    const additions = draft.trim().split(/\s+/).filter(Boolean);
    if (additions.length) onChange([...new Set([...value, ...additions])]);
    setDraft('');
  }

  return (
    <div className={styles.root}>
      {value.map((token) => (
        <span className={styles.chip} key={token}>
          {token}
          <button
            className={styles.remove}
            type="button"
            aria-label={`Remove class ${token}`}
            disabled={disabled}
            onClick={() => onChange(value.filter((item) => item !== token))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        className={styles.input}
        aria-label="Add a class"
        placeholder="Add a class…"
        list={listId}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          } else if (event.key === 'Escape') setDraft('');
        }}
      />
      <datalist id={listId}>
        {suggestions
          .filter((token) => !value.includes(token))
          .map((token) => (
            <option key={token} value={token} />
          ))}
      </datalist>
    </div>
  );
}
