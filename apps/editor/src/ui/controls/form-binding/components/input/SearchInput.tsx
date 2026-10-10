import type { InputHTMLAttributes } from 'react';
import { SearchField } from '@facadeur/form';
import { IconButton } from '../../../../components/IconButton';
import { useDraftCommit } from '../../hooks/useDraftCommit';
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
  const { draft, live, commit } = useDraftCommit(value, onLiveChange, onCommitValue);

  return (
    <div className="eu-search-wrap">
      <SearchField
        {...rest}
        id={idProp ?? id}
        name={name}
        className="eu-control"
        value={draft}
        disabled={isDisabled}
        placeholder={placeholder}
        invalid={isInvalid}
        onChange={live}
        onBlur={(event) => {
          onBlur?.(event);
          commit();
        }}
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
