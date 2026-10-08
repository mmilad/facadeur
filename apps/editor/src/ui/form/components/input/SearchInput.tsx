import type { InputHTMLAttributes } from 'react';
import { IconButton } from '../shared/IconButton';
import { useDraftCommit } from '../../hooks/useDraftCommit';
import { useBindable } from './bindable';

export function SearchInput({
  name,
  value: valueProp,
  disabled,
  invalid,
  onChange,
  onCommit,
  placeholder = 'Search…',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
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
    <div className="eu-search-wrap">
      <input
        {...rest}
        id={id}
        name={name}
        className="eu-control"
        type="search"
        value={draft}
        disabled={isDisabled}
        placeholder={placeholder}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => live(event.target.value)}
        onBlur={() => commit()}
      />
      {draft ? (
        <span className="eu-search-clear">
          <IconButton
            label="Clear search"
            disabled={isDisabled}
            onClick={() => {
              live('');
              onCommitValue('');
            }}
          >
            ×
          </IconButton>
        </span>
      ) : null}
    </div>
  );
}
