import { ColorField } from '@facadeur/form';
import { useBindable } from './bindable';

export function ColorInput({
  id: idProp,
  name,
  value: valueProp,
  disabled,
  invalid,
  onChange,
  onCommit,
}: {
  id?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
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
  } = useBindable({ name, value: valueProp, disabled, invalid, onChange, onCommit }, '#000000FF');

  return (
    <ColorField
      id={idProp ?? id}
      name={name}
      value={value}
      disabled={isDisabled}
      invalid={isInvalid}
      onChange={onLiveChange}
      onCommit={onCommitValue}
    />
  );
}
