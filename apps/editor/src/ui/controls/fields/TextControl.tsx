import { useEffect, useId, useState } from 'react';
import { TextArea, TextField } from '@facadeur/form';

export function TextControl({
  label,
  name,
  value,
  onCommit,
  multiline = false,
  placeholder,
}: {
  label: string;
  name?: string;
  value: string;
  onCommit: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <TextArea
          id={id}
          name={name ?? id}
          rows={3}
          placeholder={placeholder}
          value={draft}
          onChange={setDraft}
          onCommit={(next) => {
            if (next !== value) onCommit(next);
          }}
        />
      ) : (
        <TextField
          id={id}
          name={name ?? id}
          label={label}
          value={draft}
          placeholder={placeholder}
          onChange={setDraft}
          onCommit={(next) => {
            if (next !== value) onCommit(next);
          }}
        />
      )}
    </label>
  );
}
