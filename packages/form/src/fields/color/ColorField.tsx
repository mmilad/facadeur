import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import styles from './ColorField.module.css';
import type { ColorFieldProps } from './types';
import {
  hexToRgba,
  normalizeColor,
  normalizeHex,
  pickColorWithEyeDropper,
  rgbaToHex,
  supportsEyeDropper,
} from './color';

export function ColorField({
  id,
  name,
  label,
  value,
  disabled,
  invalid,
  onChange,
  onCommit,
}: ColorFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const normalized = normalizeColor(value);
  const rgba = useMemo(() => hexToRgba(normalized) ?? { r: 0, g: 0, b: 0, a: 1 }, [normalized]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(normalized);
  const [hexDraft, setHexDraft] = useState(normalized);

  useEffect(() => {
    setDraft(normalized);
    setHexDraft(normalized);
  }, [normalized]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const swatchStyle: CSSProperties = {
    background: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
  };

  function update(next: string) {
    setDraft(next);
    onChange(next);
  }

  function commit(next = draft) {
    onCommit?.(next);
  }

  function applyChannel(next: typeof rgba) {
    const color = rgbaToHex(next);
    setHexDraft(color);
    update(color);
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.swatch}
          style={swatchStyle}
          disabled={disabled}
          aria-label={label ? `Open ${label} color editor` : 'Open color editor'}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        />
        <input
          id={id}
          name={name}
          className={styles.input}
          value={draft}
          disabled={disabled}
          aria-label={label}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setHexDraft(next);
            update(normalizeColor(next));
          }}
          onBlur={() => {
            const next = normalizeColor(hexDraft);
            setDraft(next);
            setHexDraft(next);
            update(next);
            commit(next);
          }}
        />
      </div>
      {open ? (
        <div className={styles.panel}>
          <label className={styles.label} htmlFor={`${id}-hex`}>
            Hex
          </label>
          <input
            id={`${id}-hex`}
            className={styles.input}
            value={hexDraft}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            onChange={(event) => {
              const next = event.currentTarget.value;
              setHexDraft(next);
              const parsed = normalizeHex(next);
              if (parsed) update(parsed);
            }}
            onBlur={() => {
              const next = normalizeColor(hexDraft);
              setHexDraft(next);
              update(next);
              commit(next);
            }}
          />
          <span className={styles.label}>RGB / Alpha (0–1)</span>
          <div className={styles.channels}>
            {(['r', 'g', 'b'] as const).map((channel) => (
              <input
                key={channel}
                className={styles.input}
                type="number"
                min={0}
                max={255}
                value={rgba[channel]}
                disabled={disabled}
                aria-label={channel.toUpperCase()}
                onChange={(event) =>
                  applyChannel({ ...rgba, [channel]: Number(event.currentTarget.value) })
                }
                onBlur={() => commit()}
              />
            ))}
            <input
              className={styles.input}
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={rgba.a}
              disabled={disabled}
              aria-label="Alpha"
              onChange={(event) => applyChannel({ ...rgba, a: Number(event.currentTarget.value) })}
              onBlur={() => commit()}
            />
          </div>
          <div className={styles.tools}>
            <input
              type="color"
              value={`#${normalized.slice(1, 7)}`}
              disabled={disabled}
              aria-label="Native color picker"
              onChange={(event) => {
                const next = normalizeColor(event.currentTarget.value);
                setHexDraft(next);
                update(next);
              }}
              onBlur={() => commit()}
            />
            <button
              type="button"
              className={styles.eyeDropper}
              aria-label="Pick color from screen"
              disabled={disabled || !supportsEyeDropper()}
              onClick={async () => {
                const next = await pickColorWithEyeDropper();
                if (!next) return;
                setDraft(next);
                setHexDraft(next);
                onChange(next);
                commit(next);
              }}
            >
              ⌖
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
