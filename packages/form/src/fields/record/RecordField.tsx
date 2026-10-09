import React, { useRef, useState } from 'react';
import styles from './RecordField.module.css';
import type { RecordFieldProps } from './types';

type Draft = { id: string; key: string; value: string };

export function RecordField({
  id,
  value,
  keyLabel = 'Key',
  valueLabel = 'Value',
  bindOptions = [],
  suggestions,
  bindable = false,
  disabled,
  onChange,
}: RecordFieldProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const rowIds = useRef(new Map<string, string>());
  const rows = [
    ...Object.entries(value).map(([key, rowValue]) => {
      const id = rowIds.current.get(key) ?? key;
      rowIds.current.set(key, id);
      return { id, key, value: rowValue };
    }),
    ...drafts,
  ];

  function update(row: Draft, patch: Partial<Draft>) {
    const next = { ...row, ...patch };
    if (Object.prototype.hasOwnProperty.call(value, row.key)) {
      const updated = { ...value };
      if (patch.key !== undefined && patch.key !== row.key && patch.key.trim()) {
        delete updated[row.key];
        updated[patch.key.trim()] = next.value;
        rowIds.current.delete(row.key);
        rowIds.current.set(patch.key.trim(), row.id);
      } else if (patch.value !== undefined) {
        updated[row.key] = next.value;
      }
      onChange(updated);
    } else {
      setDrafts((current) => current.map((item) => (item.id === row.id ? next : item)));
    }
  }

  function commit(row: Draft) {
    const key = row.key.trim();
    if (!key) return;
    onChange({ ...value, [key]: row.value });
    setDrafts((current) => current.filter((item) => item.id !== row.id));
  }

  function remove(row: Draft) {
    if (Object.prototype.hasOwnProperty.call(value, row.key)) {
      const next = { ...value };
      delete next[row.key];
      rowIds.current.delete(row.key);
      onChange(next);
    } else setDrafts((current) => current.filter((item) => item.id !== row.id));
  }

  return (
    <div className={styles.root}>
      {rows.map((row) => {
        const isDraft = !Object.prototype.hasOwnProperty.call(value, row.key);
        const isBound = bindOptions.some((option) => option.value === row.value);
        return (
          <div className={styles.row} key={row.id}>
            <div className={styles.inputs}>
              <input
                className={styles.input}
                id={id}
                aria-label={keyLabel}
                value={row.key}
                list={`${id}-keys`}
                disabled={disabled}
                onChange={(event) => update(row, { key: event.currentTarget.value })}
                onBlur={() => isDraft && commit(row)}
              />
              {bindable && bindOptions.length > 0 ? (
                <div className={styles.valueInput}>
                  {isBound ? (
                    <select
                      className={styles.select}
                      aria-label={valueLabel}
                      value={row.value}
                      disabled={disabled}
                      onChange={(event) => update(row, { value: event.currentTarget.value })}
                    >
                      {bindOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={styles.input}
                      aria-label={valueLabel}
                      value={row.value}
                      list={`${id}-values-${row.id}`}
                      disabled={disabled}
                      onChange={(event) => update(row, { value: event.currentTarget.value })}
                      onBlur={() => isDraft && commit(row)}
                    />
                  )}
                  <button
                    className={styles.button}
                    type="button"
                    aria-label={isBound ? 'Switch to literal value' : 'Bind design prop'}
                    disabled={disabled}
                    onClick={() => update(row, { value: isBound ? '' : bindOptions[0]!.value })}
                  >
                    {isBound ? 'Aa' : '{ }'}
                  </button>
                </div>
              ) : (
                <input
                  className={styles.input}
                  aria-label={valueLabel}
                  value={row.value}
                  list={`${id}-values-${row.id}`}
                  disabled={disabled}
                  onChange={(event) => update(row, { value: event.currentTarget.value })}
                  onBlur={() => isDraft && commit(row)}
                />
              )}
            </div>
            <datalist id={`${id}-values-${row.id}`}>
              {(suggestions?.valuesByKey?.[row.key] ?? []).map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <button
              className={styles.button}
              type="button"
              aria-label={`Remove ${keyLabel}`}
              disabled={disabled}
              onClick={() => remove(row)}
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        className={styles.button}
        type="button"
        aria-label={`Add ${keyLabel}`}
        disabled={disabled}
        onClick={() =>
          setDrafts((current) => [
            ...current,
            { id: `draft-${Date.now()}-${current.length}`, key: '', value: '' },
          ])
        }
      >
        +
      </button>
      <datalist id={`${id}-keys`}>
        {suggestions?.keys?.map((key) => (
          <option key={key} value={key} />
        ))}
      </datalist>
    </div>
  );
}
