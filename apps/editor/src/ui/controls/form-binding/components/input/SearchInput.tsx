import type { InputHTMLAttributes } from 'react';
import { SearchField } from '@facadeur/form';
import { IconButton } from '../../../../components/IconButton';
import { useBindable } from './bindable';

export function SearchInput({
  name,
  value: valueProp,
  id: idProp,
  onBlur,
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
  return (
    <div className="eu-search-wrap">
      <SearchField
        {...rest}
        id={idProp ?? id}
        name={name}
        className="eu-control"
        value={value}
        disabled={isDisabled}
        placeholder={placeholder}
        invalid={isInvalid}
        onChange={onLiveChange}
        onCommit={onCommitValue}
        onBlur={onBlur}
      />
      {value ? (
        <span className="eu-search-clear">
          <IconButton
            label="Clear search"
            disabled={isDisabled}
            onClick={() => {
              onLiveChange('');
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
