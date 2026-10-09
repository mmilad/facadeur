import { useEffect, useId, useState } from 'react';
import { AutocompleteSelectField, TextField } from '@facadeur/form';
import {
  useTokenPreview,
  useTokenLabel,
  useTokenResolver,
  useTokenSearchValue,
} from './TokenPreviewContext';
import { tokenPath, tokenTitle } from '../token-presentation';

/** Token references are kept verbatim, including references not in the current catalog. */
export function isTokenReference(value: string): boolean {
  return /^\{[^{}]+\}$/.test(value.trim());
}

/** Opening the picker never changes the stored value or token reference. */
export function TokenValueControl({
  name,
  label,
  value,
  tokens,
  onCommit,
  placeholder,
  tokenOnly = false,
  color = false,
}: {
  name?: string;
  label?: string;
  value: string;
  tokens: readonly string[];
  onCommit: (value: string | null) => void;
  placeholder?: string;
  tokenOnly?: boolean;
  color?: boolean;
}) {
  const id = useId();
  const reference = isTokenReference(value);
  const [editingDirect, setEditingDirect] = useState(() => !reference && !tokenOnly);
  const [directDraft, setDirectDraft] = useState(value);
  const resolved = useTokenPreview(value);
  const labelFor = useTokenLabel();
  const resolve = useTokenResolver();
  const searchValue = useTokenSearchValue();
  const directValue = reference ? directDraft : value;
  const tokenOptions = [...new Set(reference ? [value.trim(), ...tokens] : tokens)].map((token) => {
    const path = tokenPath(token);
    const category = path.split('.')[0];
    return {
      value: token,
      label: labelFor(token),
      description: searchValue(token) ?? resolve(token) ?? path,
      group: category ? `${tokenTitle(category)} tokens` : undefined,
      keywords: `${path} ${tokenTitle(path)}`,
    };
  });

  useEffect(() => {
    if (reference) setEditingDirect(false);
    else {
      setEditingDirect(!tokenOnly);
      setDirectDraft(value);
    }
  }, [reference, tokenOnly, value]);

  function commitDirect(next: string | null) {
    onCommit(next);
    setEditingDirect(true);
  }

  function chooseToken(next: string) {
    onCommit(next);
    setEditingDirect(false);
  }

  return (
    <div className="token-value-field">
      {label ? <label htmlFor={editingDirect ? id : `${id}-token`}>{label}</label> : null}
      <div className="token-value" data-value-kind={reference ? 'token' : 'raw'}>
        {color && !editingDirect ? (
          <span
            className="token-value-swatch"
            style={{ background: reference ? resolved : value }}
            aria-hidden="true"
          />
        ) : null}
        {editingDirect ? (
          <>
            <TextField
              id={id}
              name={name ?? id}
              label={label}
              value={directDraft}
              placeholder={placeholder ?? 'Direct value'}
              className="eu-control"
              onChange={setDirectDraft}
              onCommit={(next) => commitDirect(next.trim() || null)}
            />
          </>
        ) : null}
        <AutocompleteSelectField
          id={`${id}-token`}
          name={name ? `${name}-token` : undefined}
          label={`Choose ${label ?? 'token'}`}
          value={reference ? value.trim() : ''}
          options={tokenOptions}
          placeholder={placeholder ?? 'Choose token…'}
          disabled={!tokenOptions.length}
          onChange={chooseToken}
          onClear={() => {
            onCommit(null);
            setEditingDirect(!tokenOnly);
          }}
        />
        {reference && !tokenOnly && !editingDirect ? (
          <button
            type="button"
            className="eu-icon-button"
            aria-label="Edit as direct value"
            title="Edit as direct value"
            onClick={() => {
              setDirectDraft(resolved ?? '');
              setEditingDirect(true);
            }}
          >
            Aa
          </button>
        ) : null}
      </div>
    </div>
  );
}
