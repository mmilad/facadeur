import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import controlStyles from '../shared/Control.module.css';
import styles from './AutocompleteSelectField.module.css';
import type { AutocompleteOption, AutocompleteSelectFieldProps } from './types';

/** Searchable option picker: query text is never emitted as a value. */
export function AutocompleteSelectField({
  id,
  name,
  label,
  value,
  options,
  placeholder = 'Choose…',
  disabled,
  onChange,
  onClear,
}: AutocompleteSelectFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    if (!search) return options;
    return options.filter((option) =>
      [option.label, option.value, option.description, option.group, option.keywords]
        .filter(Boolean)
        .some((part) => part!.toLocaleLowerCase().includes(search)),
    );
  }, [options, query]);
  const grouped = groupOptions(filtered);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const updatePosition = () => {
      const anchor = triggerRef.current?.getBoundingClientRect();
      const popover = popoverRef.current?.getBoundingClientRect();
      if (!anchor || !popover) return;
      const left = Math.max(8, Math.min(anchor.left, window.innerWidth - popover.width - 8));
      const below = anchor.bottom + 4;
      const top =
        below + popover.height <= window.innerHeight - 8
          ? below
          : Math.max(8, anchor.top - popover.height - 4);
      setPosition((current) =>
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
  }, [open, query, filtered.length]);

  function showPicker() {
    setQuery('');
    setHighlight(0);
    setOpen(true);
  }

  function select(option: AutocompleteOption) {
    onChange(option.value);
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus();
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        id={id}
        name={name}
        className={`${controlStyles.control} ${styles.trigger}`}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : showPicker())}
      >
        <span className={styles.selected}>
          {selected?.label ?? placeholder}
          {selected?.description ? <small>{selected.description}</small> : null}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={
            position
              ? { top: position.top, left: position.left, visibility: 'visible' }
              : { visibility: 'hidden' }
          }
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              setHighlight((current) => Math.min(current + 1, Math.max(0, filtered.length - 1)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setHighlight((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && filtered[highlight]) {
              event.preventDefault();
              select(filtered[highlight]!);
            }
          }}
        >
          <input
            ref={searchRef}
            className={`${controlStyles.control} ${styles.search}`}
            type="search"
            value={query}
            aria-label={`Search ${label ?? 'options'}`}
            placeholder="Search…"
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setHighlight(0);
            }}
          />
          <div className={styles.options} role="listbox" aria-label={label}>
            {grouped.map(([group, items]) => (
              <div
                className={styles.group}
                key={group ?? 'ungrouped'}
                role={group ? 'group' : undefined}
                aria-label={group}
              >
                {group ? <div className={styles.groupLabel}>{group}</div> : null}
                {items.map((option) => {
                  const index = filtered.indexOf(option);
                  return (
                    <button
                      key={option.value}
                      className={styles.option}
                      type="button"
                      role="option"
                      aria-selected={option.value === value}
                      data-highlighted={index === highlight || undefined}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => select(option)}
                    >
                      <span>{option.label}</span>
                      {option.description ? <small>{option.description}</small> : null}
                    </button>
                  );
                })}
              </div>
            ))}
            {!grouped.length ? <span className={styles.empty}>No matching options.</span> : null}
          </div>
          {onClear && value ? (
            <button
              className={styles.clear}
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
                setQuery('');
                triggerRef.current?.focus();
              }}
            >
              Clear value
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
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
