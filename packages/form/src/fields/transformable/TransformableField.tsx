import React, { useEffect, useRef, useState } from 'react';
import { AutocompleteField } from '../autocomplete/AutocompleteField';
import { ColorField } from '../color/ColorField';
import { TextField } from '../text/TextField';
import styles from './TransformableField.module.css';
import type { TransformableFieldOption, TransformableFieldProps } from './types';

type LeafOption = Exclude<TransformableFieldOption, { type: 'set' }>;
type LocatedOption = { option: LeafOption; path: number[] };

export function TransformableField({
  id,
  name,
  label,
  value,
  fieldOptions,
  placeholder,
  disabled,
  onChange,
}: TransformableFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activePath, setActivePath] = useState<number[]>([0]);
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState<number[]>([]);
  const options = normalizeOptions(fieldOptions);
  const leaves = locateLeaves(options);
  const matched = locateValue(options, value);
  const active =
    matched ??
    leaves.find(({ path }) => samePath(path, activePath)) ??
    leaves.find(({ option }) => option.type === 'text') ??
    leaves[0];
  const hasTransforms = leaves.some(({ option }) => option.type !== 'text');
  const menuOptions = optionsAtPath(options, menuPath);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function choose(option: LeafOption, path: number[]) {
    if (option.type === 'text' && matched?.option.type !== 'text' && matched) onChange('');
    else if (
      (option.type === 'prop' || option.type === 'token') &&
      matched &&
      matched.option.type !== 'text' &&
      !samePath(matched.path, path)
    ) {
      onChange('');
    } else if (option.type === 'color' && matched) onChange('#000000');
    setActivePath(path);
    setMenuPath([]);
    setOpen(false);
  }

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    setMenuPath([]);
    setOpen(true);
  }

  if (!active) {
    return (
      <TextField
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  const control =
    active.option.type === 'prop' || active.option.type === 'token' ? (
      <AutocompleteField
        id={id}
        name={name}
        label={label}
        value={value}
        options={active.option.items}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
      />
    ) : active.option.type === 'color' ? (
      <ColorField
        id={id}
        name={name}
        value={isColorValue(value) ? normalizeColor(value) : '#000000'}
        disabled={disabled}
        onChange={onChange}
      />
    ) : (
      <TextField
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
      />
    );

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.control}>{control}</div>
      {hasTransforms ? (
        <button
          className={styles.trigger}
          type="button"
          aria-label={`Transform ${label}`}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={disabled}
          onClick={toggleMenu}
        >
          ⇄
        </button>
      ) : null}
      {open ? (
        <div
          className={styles.menu}
          role="menu"
          aria-label={`Transform ${label}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
        >
          {menuPath.length ? (
            <button
              className={styles.back}
              type="button"
              onClick={() => setMenuPath(menuPath.slice(0, -1))}
            >
              ‹ Back
            </button>
          ) : null}
          {menuOptions.map((option, index) => {
            const path = [...menuPath, index];
            return option.type === 'set' ? (
              <button
                key={path.join('-')}
                className={styles.item}
                type="button"
                role="menuitem"
                onClick={() => setMenuPath(path)}
              >
                {option.label}
                <span aria-hidden="true">›</span>
              </button>
            ) : (
              <button
                key={path.join('-')}
                className={styles.item}
                type="button"
                role="menuitemradio"
                aria-checked={samePath(active.path, path)}
                onClick={() => choose(option, path)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function normalizeOptions(options: readonly TransformableFieldOption[]) {
  const normalized: TransformableFieldOption[] = [];
  for (const option of options) {
    if (option.type === 'prop' || option.type === 'token') {
      if (option.items.length) normalized.push(option);
    } else if (option.type === 'set') {
      const items = normalizeOptions(option.items);
      if (items.length) normalized.push({ ...option, items });
    } else normalized.push(option);
  }
  return normalized;
}

function locateLeaves(
  options: readonly TransformableFieldOption[],
  parentPath: number[] = [],
): LocatedOption[] {
  return options.flatMap((option, index) => {
    const path = [...parentPath, index];
    return option.type === 'set' ? locateLeaves(option.items, path) : [{ option, path }];
  });
}

function locateValue(
  options: readonly TransformableFieldOption[],
  value: string,
  parentPath: number[] = [],
): LocatedOption | undefined {
  for (const [index, option] of options.entries()) {
    const path = [...parentPath, index];
    if (option.type === 'set') {
      const nested = locateValue(option.items, value, path);
      if (nested) return nested;
    } else if (
      (option.type === 'prop' || option.type === 'token') &&
      option.items.some((item) => item.value === value)
    ) {
      return { option, path };
    }
  }
  return undefined;
}

function optionsAtPath(
  options: readonly TransformableFieldOption[],
  path: readonly number[],
): readonly TransformableFieldOption[] {
  let current = options;
  for (const index of path) {
    const option = current[index];
    if (option?.type !== 'set') return [];
    current = option.items;
  }
  return current;
}

function samePath(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isColorValue(value: string) {
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value);
}

function normalizeColor(value: string) {
  if (value.length === 4) {
    return `#${[...value.slice(1)].map((digit) => `${digit}${digit}`).join('')}`;
  }
  return value;
}
