import type { SelectHTMLAttributes } from 'react';
import type { SelectOption } from '../../types/options.js';
import { useBindable } from '../input/bindable.js';

export function Select({
  name,
  value: valueProp,
  options,
  disabled,
  invalid,
  onChange,
  onCommit,
  placeholder,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> & {
  name?: string;
  value?: string;
  options: SelectOption[];
  invalid?: boolean;
  onChange?: (value: string) => void;
  onCommit?: (value: string) => void;
  placeholder?: string;
}) {
  const {
    value,
    disabled: isDisabled,
    invalid: isInvalid,
    onImmediateChange,
    id,
  } = useBindable({ name, value: valueProp, disabled, invalid, onChange, onCommit }, '');

  return (
    <select
      {...rest}
      id={id}
      name={name}
      className="eu-control"
      value={value}
      disabled={isDisabled}
      aria-invalid={isInvalid || undefined}
      onChange={(event) => onImmediateChange(event.target.value)}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
