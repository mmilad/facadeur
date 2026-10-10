import type { SelectHTMLAttributes } from 'react';
import type { AutocompleteOption } from '@facadeur/form';
import { SelectField } from '@facadeur/form';
import { useBindable } from '../input/bindable';

export function Select({
  name,
  value: valueProp,
  id: idProp,
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
  options: AutocompleteOption[];
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
    <SelectField
      {...rest}
      id={idProp ?? id}
      name={name}
      value={value}
      options={options}
      placeholder={placeholder}
      disabled={isDisabled}
      invalid={isInvalid}
      className="eu-control"
      onChange={onImmediateChange}
    />
  );
}
