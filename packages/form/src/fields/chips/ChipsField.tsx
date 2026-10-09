import React, { useId, useState } from 'react';
import controlStyles from '../shared/Control.module.css';
import styles from './ChipsField.module.css';
import type { ChipsFieldProps } from './types';

export function ChipsField({
  id,
  name,
  value,
  suggestions = [],
  placeholder = 'Add a value…',
  disabled,
  onChange,
}: ChipsFieldProps) {
  const listId = useId();
  const [draft, setDraft] = useState('');

  function commit() {
    const additions = draft
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!additions.length) return;
    onChange([...new Set([...value, ...additions])]);
    setDraft('');
  }

  return (
    <div className={styles.root}>
      <div className={styles.chips}>
        {value.map((chip) => (
          <span className={styles.chip} key={chip}>
            <span>{chip}</span>
            <button
              className={styles.remove}
              type="button"
              aria-label={`Remove ${chip}`}
              disabled={disabled}
              onClick={() => onChange(value.filter((item) => item !== chip))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className={`${controlStyles.control} ${styles.input}`}
        id={id}
        name={name}
        placeholder={placeholder}
        list={listId}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          } else if (event.key === 'Escape') {
            setDraft('');
          }
        }}
      />
      <datalist id={listId}>
        {suggestions
          .filter((suggestion) => !value.includes(suggestion))
          .map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
      </datalist>
    </div>
  );
}
