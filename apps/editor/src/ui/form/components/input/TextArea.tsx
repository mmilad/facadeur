import type { TextareaHTMLAttributes } from 'react';
import { useDraftCommit } from '../../hooks/useDraftCommit.js';
import { useBindable } from './bindable.js';

export function TextArea({
  name,
  value: valueProp,
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
  const { draft, live, commit } = useDraftCommit(value, onLiveChange, onCommitValue);

  return (
    <textarea
      {...rest}
      id={id}
      name={name}
      className="eu-control"
      rows={rows}
      value={draft}
      disabled={isDisabled}
      aria-invalid={isInvalid || undefined}
      onChange={(event) => live(event.target.value)}
      onBlur={() => commit()}
    />
  );
}
