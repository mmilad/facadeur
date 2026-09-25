import type { InputHTMLAttributes } from 'react';
import { useDraftCommit } from '../../hooks/useDraftCommit.js';
import { useBindable } from './bindable.js';

function parseNumber(raw: string): number | null {
  if (raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function NumberInput({
  name,
  value: valueProp,
  disabled,
  invalid,
  onChange,
  onCommit,
  min,
  max,
  step,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  name?: string;
  value?: number | null;
  invalid?: boolean;
  onChange?: (value: number | null) => void;
  onCommit?: (value: number | null) => void;
}) {
  const {
    value,
    disabled: isDisabled,
    invalid: isInvalid,
    onLiveChange,
    onCommitValue,
    id,
  } = useBindable({ name, value: valueProp, disabled, invalid, onChange, onCommit }, null);
  const display = value === null || value === undefined ? '' : String(value);
  const { draft, live, commit } = useDraftCommit(
    display,
    (next) => onLiveChange(parseNumber(next)),
    (next) => onCommitValue(parseNumber(next)),
  );

  return (
    <input
      {...rest}
      id={id}
      name={name}
      className="eu-control"
      type="number"
      value={draft}
      disabled={isDisabled}
      min={min}
      max={max}
      step={step}
      aria-invalid={isInvalid || undefined}
      onChange={(event) => live(event.target.value)}
      onBlur={() => commit()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}
