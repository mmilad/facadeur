import React, { useEffect, useState, type KeyboardEvent } from 'react';
import styles from './NumberField.module.css';
import type { NumberFieldProps } from './types';

export function NumberField({
  id,
  name,
  value,
  placeholder,
  disabled,
  min,
  max,
  step,
  invalid,
  className,
  onChange,
  onCommit,
  onKeyDown: onKeyDownProp,
  ...inputProps
}: NumberFieldProps) {
  const [draft, setDraft] = useState(value === '' ? '' : String(value));
  useEffect(() => setDraft(value === '' ? '' : String(value)), [value]);

  function parse(raw: string): number | '' | undefined {
    if (raw.trim() === '') return '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return (
    <input
      {...inputProps}
      className={[styles.input, className].filter(Boolean).join(' ')}
      id={id}
      name={name}
      type="number"
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        const raw = event.currentTarget.value;
        setDraft(raw);
        const next = parse(raw);
        if (next !== undefined) onChange(next);
      }}
      onBlur={() => {
        const next = parse(draft);
        const current = value === '' ? '' : String(value);
        if (next !== undefined && draft !== current) onCommit?.(next);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDownProp?.(event);
        if (!event.defaultPrevented && event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}
