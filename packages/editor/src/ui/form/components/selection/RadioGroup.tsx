import { Stack } from '../layout/Stack.js';
import type { SelectOption } from '../../types/options.js';
import { useBindable } from '../input/bindable.js';

export function RadioGroup({
  name,
  value: valueProp,
  options,
  label,
  disabled,
  invalid,
  onChange,
  onCommit,
}: {
  name?: string;
  value?: string;
  options: SelectOption[];
  label?: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange?: (value: string) => void;
  onCommit?: (value: string) => void;
}) {
  const {
    value,
    disabled: isDisabled,
    invalid: isInvalid,
    onImmediateChange,
    id,
  } = useBindable({ name, value: valueProp, disabled, invalid, onChange, onCommit }, '');

  return (
    <Stack gap={4} aria-labelledby={label ? `${id}-label` : undefined}>
      {label ? (
        <span className="eu-field__label" id={`${id}-label`}>
          {label}
        </span>
      ) : null}
      {options.map((option) => (
        <label key={option.value} className="eu-toggle" style={{ gap: 6 }}>
          <input
            type="radio"
            name={name ?? id}
            value={option.value}
            checked={value === option.value}
            disabled={isDisabled || option.disabled}
            aria-invalid={isInvalid || undefined}
            onChange={() => onImmediateChange(option.value)}
          />
          <span className="eu-field__label">{option.label}</span>
        </label>
      ))}
    </Stack>
  );
}
