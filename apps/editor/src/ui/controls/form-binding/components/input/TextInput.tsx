import type { InputHTMLAttributes } from 'react';
import { TextField } from '@facadeur/form';
import { useBindable } from './bindable';

export function TextInput({
  name,
  value: valueProp,
  className,
  id: idProp,
  type,
  onBlur,
  'aria-label': ariaLabel,
  disabled,
  invalid,
  onChange,
  onCommit,
  placeholder,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  name?: string;
  value?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
  onCommit?: (value: string) => void;
}) {
  const {
    value,
    disabled: isDisabled,
    invalid: isInvalid,
    onLiveChange,
    onCommitValue,
    id,
  } = useBindable({ name, value: valueProp, disabled, invalid, onChange, onCommit }, '');

  return (
    <TextField
      {...rest}
      id={idProp ?? id}
      name={name}
      label={ariaLabel}
      className={className ? `eu-control ${className}` : 'eu-control'}
      type={type ?? 'text'}
      value={value}
      disabled={isDisabled}
      placeholder={placeholder}
      aria-invalid={isInvalid || undefined}
      onChange={onLiveChange}
      onCommit={(next) => {
        if (next !== value) onCommitValue(next);
      }}
      onBlur={(event) => onBlur?.(event)}
    />
  );
}
