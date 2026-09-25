import { useMemo, useState } from 'react';
import { useOptionalFormContext, usePathPrefix } from '../../FormContext.js';
import { formatKey, getPath, resolvePath } from '../../schema/path.js';
import { IconButton } from '../shared/IconButton.js';
import { Stack } from '../layout/Stack.js';
import { Inline } from '../layout/Inline.js';
import { TextInput } from '../input/TextInput.js';

type DraftRow = { id: string; key: string; value: string };

export function RecordField({
  name,
  value: valueProp,
  disabled,
  onChange,
  keyLabel = 'Property',
  valueLabel = 'Value',
}: {
  name?: string;
  value?: Record<string, string>;
  disabled?: boolean;
  onChange?: (value: Record<string, string>) => void;
  keyLabel?: string;
  valueLabel?: string;
}) {
  const form = useOptionalFormContext();
  const prefix = usePathPrefix();
  const path = name ? resolvePath(prefix, name) : '';
  const bound = form && name;
  const record = bound
    ? ((getPath(form.value, path) as Record<string, string>) ?? {})
    : (valueProp ?? {});
  const isDisabled = disabled ?? form?.disabled ?? false;

  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const rows = useMemo(
    () => [
      ...Object.entries(record).map(([key, value]) => ({ id: key, key, value })),
      ...draftRows,
    ],
    [record, draftRows],
  );

  function emit(next: Record<string, string>) {
    if (bound) form.emitChange(path, next, { commit: true });
    else onChange?.(next);
  }

  function commitRow(row: DraftRow) {
    const trimmedKey = row.key.trim();
    if (!trimmedKey) return;
    const next = { ...record, [trimmedKey]: row.value };
    emit(next);
    setDraftRows((current) => current.filter((item) => item.id !== row.id));
  }

  function updateRow(row: DraftRow, patch: Partial<DraftRow>, commitKey = false) {
    const nextRow = { ...row, ...patch };
    const isPersisted = record[row.key] !== undefined && row.key.trim();

    if (isPersisted) {
      const next = { ...record };
      if (patch.key !== undefined && patch.key !== row.key && patch.key.trim()) {
        delete next[row.key];
        next[patch.key] = nextRow.value;
        emit(next);
        return;
      }
      if (patch.value !== undefined) {
        next[row.key] = nextRow.value;
        emit(next);
      }
      return;
    }

    setDraftRows((current) => current.map((item) => (item.id === row.id ? nextRow : item)));
    if (commitKey && nextRow.key.trim()) commitRow(nextRow);
  }

  function removeRow(row: DraftRow) {
    if (record[row.key] !== undefined) {
      const next = { ...record };
      delete next[row.key];
      emit(next);
    } else {
      setDraftRows((current) => current.filter((item) => item.id !== row.id));
    }
  }

  function addRow() {
    setDraftRows((current) => [
      ...current,
      { id: `draft-${current.length}-${Date.now()}`, key: '', value: '' },
    ]);
  }

  return (
    <Stack gap={8}>
      {rows.map((row) => (
        <div className="eu-record-row" key={row.id}>
          <div className="eu-record-row__fields">
            <Inline gap={6}>
              <TextInput
                aria-label={keyLabel}
                value={row.key}
                disabled={isDisabled}
                onChange={(key) => updateRow(row, { key })}
                onCommit={(key) => updateRow({ ...row, key }, {}, true)}
              />
              <TextInput
                aria-label={valueLabel}
                value={row.value}
                disabled={isDisabled}
                onChange={(value) => updateRow(row, { value })}
                onCommit={(value) => {
                  const nextRow = { ...row, value };
                  if (row.key.trim()) commitRow(nextRow);
                }}
              />
            </Inline>
          </div>
          <IconButton label="Remove property" disabled={isDisabled} onClick={() => removeRow(row)}>
            ×
          </IconButton>
        </div>
      ))}
      <Inline>
        <IconButton label="Add property" disabled={isDisabled} onClick={addRow}>
          +
        </IconButton>
      </Inline>
    </Stack>
  );
}

export function recordPathKey(key: string): string {
  return formatKey(key);
}
