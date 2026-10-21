import type { InputHTMLAttributes } from 'react';
import { BooleanField } from '@facadeur/form';
import { useBindable } from '../input/bindable';

export type BooleanInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  name?: string;
  value?: boolean;
  checked?: boolean;
  label: string;
  invalid?: boolean;
  onChange?: (value: boolean) => void;
  onCommit?: (value: boolean) => void;
};

export function BooleanInput({
  name,
  value: valueProp,
  checked,
  label,
  disabled,
  invalid,
  onChange,
  onCommit,
  labelGap,
  switchRole,
  ...rest
}: BooleanInputProps & { labelGap?: number; switchRole?: boolean }) {
  const {
    value,
    disabled: isDisabled,
    invalid: isInvalid,
    onImmediateChange,
    id,
  } = useBindable(
    { name, value: valueProp ?? checked, disabled, invalid, onChange, onCommit },
    false,
  );

  return (
    <label className="eu-toggle" {...(labelGap === undefined ? {} : { style: { gap: labelGap } })}>
      <BooleanField
        {...rest}
        {...(switchRole ? { role: 'switch' } : {})}
        id={id}
        name={name}
        value={Boolean(value)}
        disabled={isDisabled}
        invalid={isInvalid}
        onChange={onImmediateChange}
      />
      <span className="eu-field__label">{label}</span>
    </label>
  );
}
