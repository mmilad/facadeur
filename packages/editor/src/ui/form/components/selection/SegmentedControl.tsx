import type { SelectOption } from '../../types/options.js';
import { useBindable } from '../input/bindable.js';

export function SegmentedControl({
  name,
  value: valueProp,
  options,
  disabled,
  invalid,
  onChange,
  onCommit,
}: {
  name?: string;
  value?: string;
  options: SelectOption[];
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
  } = useBindable(
    { name, value: valueProp, disabled, invalid, onChange, onCommit },
    options[0]?.value ?? '',
  );

  return (
    <div
      className="eu-segmented"
      role="group"
      aria-labelledby={id}
      aria-invalid={isInvalid || undefined}
    >
      <span id={id} style={{ display: 'none' }} />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={isDisabled || option.disabled}
          aria-pressed={value === option.value}
          onClick={() => onImmediateChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
