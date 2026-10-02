import { useId, useState } from 'react';
import { ColorInput, Field, Popover, TextInput } from '../../form/index.js';
import '../../form/form.css';
import {
  useTokenPreview,
  useTokenLabel,
  useTokenValueLabel,
  useTokenResolver,
  useTokenSearchValue,
} from './TokenPreviewContext.js';
import { tokenPath, tokenTitle } from '../token-presentation.js';
import { matchesSearch } from '../../form/types/options.js';

/** Token references are kept verbatim, including references not in the current catalog. */
export function isTokenReference(value: string): boolean {
  return /^\{[^{}]+\}$/.test(value.trim());
}

function supportsColorPicker(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed === '' ||
    /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(trimmed) ||
    /^rgba?\(/i.test(trimmed)
  );
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');
  const reference = isTokenReference(value);
  const resolved = useTokenPreview(value);
  const labelFor = useTokenLabel();
  const valueLabelFor = useTokenValueLabel();
  const resolve = useTokenResolver();
  const searchValue = useTokenSearchValue();
  const path = reference ? value.trim().slice(1, -1) : value;
  const options = [...new Set(reference ? [value, ...tokens] : tokens)].filter((token) =>
    matchesSearch(
      query,
      labelFor(token),
      token,
      tokenTitle(token),
      searchValue(token),
      resolve(token),
    ),
  );
  function pick(next: string | null) {
    onCommit(next);
    setOpen(false);
  }
  return (
    <Field label={label} htmlFor={id}>
      <div className="token-value" data-value-kind={reference ? 'token' : 'raw'}>
        {color ? (
          <span
            className="token-value-swatch"
            style={{ background: reference ? resolved : value }}
            aria-hidden="true"
          />
        ) : null}
        {reference || tokenOnly ? (
          <button
            id={id}
            name={name}
            type="button"
            className="eu-control token-value-reference"
            aria-haspopup="dialog"
            title={
              reference
                ? `Token reference: ${value}${resolved ? ` · ${resolved}` : ''}`
                : `Choose ${label ?? 'value'} token`
            }
            onClick={() => {
              setQuery('');
              setCustom('');
              setOpen(true);
            }}
          >
            {reference ? <span aria-label="Token reference">◇ </span> : null}
            {(reference ? valueLabelFor(value) : path) || placeholder || 'Inherited'}
          </button>
        ) : (
          <TextInput
            id={id}
            name={name}
            aria-label={label}
            value={value}
            placeholder={placeholder ?? 'Inherited'}
            onCommit={(next) => onCommit(next.trim() || null)}
          />
        )}
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              setQuery('');
              setCustom(reference ? '' : value);
            }
          }}
          trigger={
            <button
              type="button"
              className="eu-icon-button"
              aria-label={`Choose ${label ?? 'value'} or token`}
              title="Choose value or token"
            >
              ▾
            </button>
          }
        >
          <div className="token-value-picker">
            {!tokenOnly ? (
              <>
                <Field label="Direct value">
                  <TextInput
                    name={name ? `${name}-custom` : undefined}
                    aria-label="Direct value"
                    value={custom}
                    onChange={setCustom}
                    placeholder={placeholder}
                  />
                </Field>
                {color && supportsColorPicker(custom) ? (
                  <ColorInput value={custom || '#000000'} onCommit={(next) => pick(next)} />
                ) : null}
                <button
                  type="button"
                  className="eu-button"
                  disabled={!custom.trim()}
                  onClick={() => pick(custom.trim())}
                >
                  Use direct value
                </button>
              </>
            ) : (
              <p className="eu-field__hint">Spacing uses design tokens.</p>
            )}
            <label className="eu-field__label" htmlFor={`${id}-search`}>
              Tokens
            </label>
            <input
              id={`${id}-search`}
              className="eu-control"
              type="search"
              value={query}
              placeholder="Find token…"
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="token-value-options">
              {options.map((token) => (
                <button
                  type="button"
                  className="eu-combobox-option"
                  key={token}
                  aria-pressed={value === token}
                  onClick={() => pick(token)}
                >
                  {isTokenReference(token) ? `◇ ${labelFor(token)}` : token}
                  {isTokenReference(token) ? (
                    <small style={{ display: 'block' }}>{tokenPath(token)}</small>
                  ) : null}
                </button>
              ))}
              {!options.length ? <span className="eu-field__hint">No matching tokens.</span> : null}
            </div>
            <button type="button" className="text-button" onClick={() => pick(null)}>
              Clear value
            </button>
          </div>
        </Popover>
      </div>
    </Field>
  );
}
