import type { InputHTMLAttributes } from 'react';
import { useBindable } from '../input/bindable.js';

export function Checkbox({
  name,
  value: valueProp,
  label,
  disabled,
  invalid,
  onChange,
  onCommit,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  name?: string;
  value?: boolean;
  label: string;
  invalid?: boolean;
  onChange?: (value: boolean) => void;
  onCommit?: (value: boolean) => void;
}) {
  const {
    value,
    disabled: isDisabled,
    invalid: isInvalid,
    onImmediateChange,
    id,
  } = useBindable({ name, value: valueProp, disabled, invalid, onChange, onCommit }, false);

  return (
    <label className="eu-toggle" style={{ gap: 6 }}>
      <input
        {...rest}
        id={id}
        name={name}
        type="checkbox"
        checked={Boolean(value)}
        disabled={isDisabled}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => onImmediateChange(event.target.checked)}
      />
      <span className="eu-field__label">{label}</span>
    </label>
  );
}
