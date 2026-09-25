import type { InputHTMLAttributes } from 'react';
import { useDraftCommit } from '../../hooks/useDraftCommit.js';
import { useBindable } from './bindable.js';

export function TextInput({
  name,
  value: valueProp,
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
  const { draft, live, commit } = useDraftCommit(value, onLiveChange, onCommitValue);

  return (
    <input
      {...rest}
      id={id}
      name={name}
      className="eu-control"
      type="text"
      value={draft}
      disabled={isDisabled}
      placeholder={placeholder}
      aria-invalid={isInvalid || undefined}
      onChange={(event) => live(event.target.value)}
      onBlur={() => commit()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
    />
  );
}
