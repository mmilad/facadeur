import type { InputHTMLAttributes } from 'react';
import { NumberField } from '@facadeur/form';
import { useBindable } from './bindable';

export function NumberInput({
  name,
  value: valueProp,
  id: idProp,
  onBlur: _onBlur,
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
  return (
    <NumberField
      {...rest}
      id={idProp ?? id}
      name={name}
      className="eu-control"
      value={value === null ? '' : value}
      disabled={isDisabled}
      min={min}
      max={max}
      step={step}
      invalid={isInvalid}
      onChange={(next) => onLiveChange(next === '' ? null : next)}
      onCommit={(next) => onCommitValue(next === '' ? null : next)}
    />
  );
}
