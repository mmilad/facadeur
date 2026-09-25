import { useEffect, useState, type KeyboardEvent } from 'react';

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
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit() {
    if (draft !== value) onCommit(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !multiline) event.currentTarget.blur();
  }

  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          name={name}
          rows={3}
          placeholder={placeholder}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      ) : (
        <input
          name={name}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      )}
    </label>
  );
}
