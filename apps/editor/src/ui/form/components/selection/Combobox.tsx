import * as Popover from '@radix-ui/react-popover';
import { useMemo, useState, type ReactNode } from 'react';
import type { SelectOption } from '../../types/options.js';
import { useBindable } from '../input/bindable.js';

export function Combobox({
  name,
  value: valueProp,
  options,
  disabled,
  invalid,
  onChange,
  onCommit,
  placeholder = 'Select…',
}: {
  name?: string;
  value?: string;
  options: SelectOption[];
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? '';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          name={name}
          className="eu-control"
          disabled={isDisabled}
          aria-invalid={isInvalid || undefined}
          aria-haspopup="listbox"
        >
          {selectedLabel || placeholder}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="eu-popover-content" sideOffset={4}>
          <div style={{ padding: 8, minWidth: 220 }}>
            <input
              className="eu-control"
              value={query}
              placeholder="Filter…"
              autoFocus
              onChange={(event) => {
                setQuery(event.target.value);
                setHighlight(0);
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setHighlight((index) => Math.min(index + 1, filtered.length - 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setHighlight((index) => Math.max(index - 1, 0));
                } else if (event.key === 'Enter' && filtered[highlight]) {
                  event.preventDefault();
                  onImmediateChange(filtered[highlight].value);
                  setOpen(false);
                  setQuery('');
                } else if (event.key === 'Escape') {
                  setOpen(false);
                }
              }}
            />
            <ul className="eu-combobox-list" role="listbox">
              {filtered.map((option, index) => (
                <li key={option.value}>
                  <OptionRow
                    option={option}
                    highlighted={index === highlight}
                    onPick={() => {
                      onImmediateChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function OptionRow({
  option,
  highlighted,
  onPick,
}: {
  option: SelectOption;
  highlighted: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className="eu-combobox-option"
      data-highlighted={highlighted ? 'true' : 'false'}
      disabled={option.disabled}
      onMouseEnter={(event) => {
        event.currentTarget.dataset.highlighted = 'true';
      }}
      onClick={onPick}
    >
      {option.label as ReactNode}
    </button>
  );
}
