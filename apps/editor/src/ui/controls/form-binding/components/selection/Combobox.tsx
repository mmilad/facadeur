import { AutocompleteSelectField } from '@facadeur/form';
import type { AutocompleteOption } from '@facadeur/form';
import { useBindable } from '../input/bindable';

export function Combobox({
  name,
  value: valueProp,
  options,
  currentLabel,
  label,
  disabled,
  invalid,
  onChange,
  onCommit,
  placeholder = 'Select…',
}: {
  name?: string;
  value?: string;
  options: AutocompleteOption[];
  /** Display override for the selected value; option labels stay unchanged. */
  currentLabel?: string;
  label?: string;
  disabled?: boolean;
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
    <AutocompleteSelectField
      id={id}
      name={name}
      label={label}
      value={value}
      selectedLabel={currentLabel}
      options={options}
      placeholder={placeholder}
      disabled={isDisabled}
      invalid={isInvalid}
      onChange={onImmediateChange}
    />
  );
}
