import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AutocompleteSelectField } from '../autocomplete/AutocompleteSelectField';
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
  onCommit,
  onTransform,
}: TransformableFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activePath, setActivePath] = useState<number[] | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState<number[]>([]);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const options = normalizeOptions(fieldOptions);
  const leaves = locateLeaves(options);
  const matched = locateValue(options, value);
  const active =
    (activePath ? leaves.find(({ path }) => samePath(path, activePath)) : undefined) ??
    matched ??
    leaves.find(({ option }) => option.type === 'text') ??
    leaves[0];
  const hasTransforms = leaves.some(({ option }) => option.type !== 'text');
  const menuOptions = optionsAtPath(options, menuPath);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    const updatePosition = () => {
      const anchor = triggerRef.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!anchor || !menu) return;
      const left = Math.max(
        8,
        Math.min(anchor.right - menu.width, window.innerWidth - menu.width - 8),
      );
      const below = anchor.bottom + 4;
      const top =
        below + menu.height <= window.innerHeight - 8
          ? below
          : Math.max(8, anchor.top - menu.height - 4);
      setMenuPosition((current) =>
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
  }, [open, menuPath, menuOptions.length]);

  function choose(option: LeafOption, path: number[]) {
    onTransform?.(option.type);
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
        onCommit={onCommit}
      />
    );
  }

  const control =
    active.option.type === 'prop' || active.option.type === 'token' ? (
      <AutocompleteSelectField
        id={id}
        name={name}
        label={label}
        value={value}
        options={active.option.items}
        placeholder={placeholder ?? 'Choose an option…'}
        disabled={disabled}
        onChange={(next) => {
          onChange(next);
          onCommit?.(next);
        }}
      />
    ) : active.option.type === 'color' ? (
      <ColorField
        id={id}
        name={name}
        value={isColorValue(value) ? normalizeColor(value) : '#000000'}
        disabled={disabled}
        onChange={(next) => {
          onChange(next);
          onCommit?.(next);
        }}
      />
    ) : (
      <TextField
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
        onCommit={onCommit}
      />
    );

  return (
    <div
      className={styles.root}
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) setOpen(false);
      }}
    >
      <div className={styles.control}>{control}</div>
      {hasTransforms ? (
        <button
          ref={triggerRef}
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
          ref={menuRef}
          className={styles.menu}
          role="menu"
          aria-label={`Transform ${label}`}
          style={{
            top: menuPosition?.top ?? 0,
            left: menuPosition?.left ?? 0,
            visibility: menuPosition ? 'visible' : 'hidden',
          }}
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
