import type { TextareaHTMLAttributes } from 'react';
import { TextArea as SharedTextArea } from '@facadeur/form';
import { useBindable } from './bindable';

export function TextArea({
  name,
  value: valueProp,
  id: idProp,
  onBlur,
  disabled,
  invalid,
  onChange,
  onCommit,
  rows = 3,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
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
    <SharedTextArea
      {...rest}
      id={idProp ?? id}
      name={name}
      className="eu-control"
      rows={rows}
      value={value}
      disabled={isDisabled}
      invalid={isInvalid}
      onChange={onLiveChange}
      onCommit={(next) => {
        if (next !== value) onCommitValue(next);
      }}
      onBlur={onBlur}
    />
  );
}
