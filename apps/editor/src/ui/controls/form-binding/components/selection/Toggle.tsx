import type { InputHTMLAttributes } from 'react';
import { BooleanField } from '@facadeur/form';
import { useBindable } from '../input/bindable';

export function Toggle({
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
    <label className="eu-toggle">
      <BooleanField
        {...rest}
        id={id}
        name={name}
        role="switch"
        value={Boolean(value)}
        disabled={isDisabled}
        invalid={isInvalid}
        onChange={onImmediateChange}
      />
      <span className="eu-field__label">{label}</span>
    </label>
  );
}
