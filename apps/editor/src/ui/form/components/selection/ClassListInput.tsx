import { useId, useState } from 'react';

export function ClassListInput({
  value,
  suggestions,
  label,
  disabled,
  onChange,
}: {
  value: readonly string[];
  suggestions: readonly string[];
  label: string;
  disabled?: boolean;
  onChange: (classes: string[]) => void;
}) {
  const listId = useId();
  const [draft, setDraft] = useState('');
  function commit() {
    const additions = draft.trim().split(/\s+/).filter(Boolean);
    if (!additions.length) return;
    onChange([...new Set([...value, ...additions])]);
    setDraft('');
  }
  return (
    <div className="eu-class-list">
      {value.map((token) => (
        <span className="eu-class-badge" key={token}>
          <span>{token}</span>
          <button
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
        className="eu-control"
        aria-label={label}
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
          } else if (event.key === 'Escape') {
            setDraft('');
          }
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
