import React, { useRef, useState } from 'react';
import { AutocompleteField } from '../autocomplete/AutocompleteField';
import styles from './RecordField.module.css';
import type { RecordFieldProps } from './types';

type Draft = { id: string; key: string; value: string };
type Row = Draft & { isDraft: boolean };

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
  const nextDraftId = useRef(0);
  const rows = [
    ...Object.entries(value).map(([key, rowValue]) => {
      const id = rowIds.current.get(key) ?? key;
      rowIds.current.set(key, id);
      return { id, key, value: rowValue, isDraft: false };
    }),
    ...drafts.map((draft) => ({ ...draft, isDraft: true })),
  ];

  function update(row: Row, patch: Partial<Draft>) {
    const next = { ...row, ...patch };
    if (!row.isDraft) {
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

  function commit(row: Row) {
    const key = row.key.trim();
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(value, key)) return;
    if (drafts.some((draft) => draft.id !== row.id && draft.key.trim() === key)) return;
    rowIds.current.set(key, row.id);
    onChange({ ...value, [key]: row.value });
    setDrafts((current) => current.filter((item) => item.id !== row.id));
  }

  function remove(row: Row) {
    if (!row.isDraft) {
      const next = { ...value };
      delete next[row.key];
      rowIds.current.delete(row.key);
      onChange(next);
    } else setDrafts((current) => current.filter((item) => item.id !== row.id));
  }

  return (
    <div className={styles.root}>
      {rows.map((row, index) => {
        const keyOptions = (suggestions?.keys ?? []).map((key) => ({ value: key, label: key }));
        const valueOptions = [
          ...(suggestions?.valuesByKey?.[row.key] ?? []).map((suggestion) => ({
            value: suggestion,
            label: suggestion,
            group: 'Existing values',
          })),
          ...(suggestions?.options ?? []),
          ...(bindable
            ? bindOptions.map((option) => ({
                ...option,
                group: 'Props',
                displayLabel: true,
              }))
            : []),
        ];
        return (
          <div
            className={styles.row}
            key={row.id}
            onBlur={(event) => {
              if (!row.isDraft) return;
              const nextTarget = event.relatedTarget;
              if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
              commit(row);
            }}
          >
            <div className={styles.inputs}>
              <AutocompleteField
                id={index === 0 ? id : `${id}-${row.id}-key`}
                label={keyLabel}
                value={row.key}
                options={keyOptions}
                placeholder={keyLabel}
                disabled={disabled}
                onChange={(next) => update(row, { key: next })}
              />
              <AutocompleteField
                id={`${id}-${row.id}-value`}
                label={valueLabel}
                value={row.value}
                options={valueOptions}
                placeholder={valueLabel}
                disabled={disabled}
                onChange={(next) => update(row, { value: next })}
              />
            </div>
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
            { id: `draft-${nextDraftId.current++}`, key: '', value: '' },
          ])
        }
      >
        +
      </button>
    </div>
  );
}
