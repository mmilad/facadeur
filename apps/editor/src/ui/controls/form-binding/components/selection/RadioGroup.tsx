import { RadioGroupField } from '@facadeur/form';
import type { AutocompleteOption } from '@facadeur/form';
import { useBindable } from '../input/bindable';

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
  options: AutocompleteOption[];
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
    <RadioGroupField
      id={id}
      name={name}
      label={label}
      value={value}
      options={options}
      disabled={isDisabled}
      invalid={isInvalid}
      onChange={onImmediateChange}
    />
  );
}
