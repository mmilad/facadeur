import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import controlStyles from '../shared/Control.module.css';
import styles from './AutocompleteField.module.css';
import type { AutocompleteFieldProps, AutocompleteOption } from './types';

export function AutocompleteField({
  id,
  name,
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: AutocompleteFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value && option.displayLabel);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [directValue, setDirectValue] = useState(value);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = rootRef.current?.getBoundingClientRect();
      const popover = popoverRef.current?.getBoundingClientRect();
      if (!anchor || !popover) return;

      const left = Math.max(8, Math.min(anchor.left, window.innerWidth - popover.width - 8));
      const below = anchor.bottom + 4;
      const top =
        below + popover.height <= window.innerHeight - 8
          ? below
          : Math.max(8, anchor.top - popover.height - 4);
      setPopoverPosition((current) =>
        current?.top === top && current.left === left ? current : { top, left },
      );
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, query]);

  const filteredOptions = options.filter((option) =>
    [option.label, option.value, option.description, option.group]
      .filter(Boolean)
      .some((part) => part!.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
  );
  const groupedOptions = groupOptions(filteredOptions);

  function showPicker() {
    setDirectValue(selected ? '' : value);
    setQuery('');
    setOpen(true);
  }

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      {selected ? (
        <button
          id={id}
          name={name}
          type="button"
          className={`${controlStyles.control} ${styles.reference}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={showPicker}
        >
          <span aria-hidden="true">◇ </span>
          {selected.label}
        </button>
      ) : (
        <input
          id={id}
          name={name}
          className={`${controlStyles.control} ${styles.input}`}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
      <button
        className={`${controlStyles.control} ${styles.trigger}`}
        type="button"
        aria-label={`Choose ${label ?? 'value'} or suggestion`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : showPicker())}
      >
        ▾
      </button>
      {open ? (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={
            popoverPosition
              ? { top: popoverPosition.top, left: popoverPosition.left, visibility: 'visible' }
              : { visibility: 'hidden' }
          }
          role="dialog"
          aria-label={`${label ?? 'Value'} suggestions`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
              event.preventDefault();
              if (event.target.id === `${id}-direct` && directValue.trim()) {
                pick(directValue.trim());
              } else if (event.target.id === `${id}-search` && filteredOptions[0]) {
                pick(filteredOptions[0].value);
              }
            }
          }}
        >
          <label className={styles.label} htmlFor={`${id}-direct`}>
            Direct value
          </label>
          <input
            id={`${id}-direct`}
            className={controlStyles.control}
            value={directValue}
            placeholder={placeholder}
            onChange={(event) => setDirectValue(event.currentTarget.value)}
          />
          <button
            className={controlStyles.control}
            type="button"
            disabled={!directValue.trim()}
            onClick={() => pick(directValue.trim())}
          >
            Use direct value
          </button>
          <label className={styles.label} htmlFor={`${id}-search`}>
            Suggestions
          </label>
          <input
            id={`${id}-search`}
            className={controlStyles.control}
            type="search"
            value={query}
            placeholder="Search…"
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <div className={styles.options} role="listbox" aria-label="Suggestions">
            {groupedOptions.map(([group, items]) => (
              <div
                className={styles.group}
                key={group ?? 'ungrouped'}
                role={group ? 'group' : undefined}
                aria-label={group}
              >
                {group ? <div className={styles.groupLabel}>{group}</div> : null}
                {items.map((option) => (
                  <OptionButton
                    key={option.value}
                    option={option}
                    selected={option.value === value}
                    onSelect={() => pick(option.value)}
                  />
                ))}
              </div>
            ))}
            {!groupedOptions.length ? (
              <span className={styles.empty}>No matching suggestions.</span>
            ) : null}
          </div>
          <button className={styles.clear} type="button" onClick={() => pick('')}>
            Clear value
          </button>
        </div>
      ) : null}
    </div>
  );
}

function OptionButton({
  option,
  selected,
  onSelect,
}: {
  option: AutocompleteOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={styles.option}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
    >
      <span>{option.label}</span>
      {option.description || option.value !== option.label ? (
        <small>{option.description ?? option.value}</small>
      ) : null}
    </button>
  );
}

function groupOptions(options: readonly AutocompleteOption[]) {
  const groups = new Map<string | undefined, AutocompleteOption[]>();
  for (const option of options) {
    const items = groups.get(option.group) ?? [];
    items.push(option);
    groups.set(option.group, items);
  }
  return [...groups.entries()];
}
