import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Popover } from '../overlay/Popover.js';
import { IconButton } from '../shared/IconButton.js';
import { Inline } from '../layout/Inline.js';
import { Stack } from '../layout/Stack.js';
import { useDraftCommit } from '../../hooks/useDraftCommit.js';
import { useBindable } from './bindable.js';
import {
  hexToRgba,
  normalizeColor,
  normalizeHex,
  pickColorWithEyeDropper,
  rgbaToHex,
  supportsEyeDropper,
  type Rgba,
} from './color.js';

export function ColorInput({
  name,
  value: valueProp,
  disabled,
  invalid,
  onChange,
  onCommit,
}: {
  name?: string;
  value?: string;
  disabled?: boolean;
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
  } = useBindable({ name, value: valueProp, disabled, invalid, onChange, onCommit }, '#000000FF');
  const normalized = normalizeColor(value);
  const rgba = useMemo(() => hexToRgba(normalized) ?? { r: 0, g: 0, b: 0, a: 1 }, [normalized]);
  const { draft, live, commit } = useDraftCommit(normalized, onLiveChange, onCommitValue);
  const [hexDraft, setHexDraft] = useState(draft);
  useEffect(() => {
    setHexDraft(draft);
  }, [draft]);

  const swatchStyle: CSSProperties = {
    background: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
  };

  function applyRgba(next: Rgba, commitNow = false) {
    const hex = rgbaToHex(next);
    live(hex);
    if (commitNow) onCommitValue(hex);
  }

  return (
    <Inline gap={6}>
      <Popover
        trigger={
          <button
            type="button"
            className="eu-color-swatch"
            style={swatchStyle}
            disabled={isDisabled}
            aria-label="Open color editor"
          />
        }
      >
        <div className="eu-color-panel">
          <Stack gap={8}>
            <label className="eu-field__label" htmlFor={`${id}-hex`}>
              Hex
            </label>
            <input
              id={`${id}-hex`}
              className="eu-control"
              value={hexDraft}
              disabled={isDisabled}
              aria-invalid={isInvalid || undefined}
              onChange={(event) => {
                setHexDraft(event.target.value);
                const parsed = normalizeHex(event.target.value);
                if (parsed) live(parsed);
              }}
              onBlur={() => {
                const parsed = normalizeColor(hexDraft);
                setHexDraft(parsed);
                live(parsed);
                commit();
              }}
            />
            <span className="eu-field__label">RGB / Alpha (0–1)</span>
            <div className="eu-color-channels">
              {(['r', 'g', 'b'] as const).map((channel) => (
                <input
                  key={channel}
                  className="eu-control"
                  type="number"
                  min={0}
                  max={255}
                  value={rgba[channel]}
                  disabled={isDisabled}
                  aria-label={channel.toUpperCase()}
                  onChange={(event) => {
                    const next = { ...rgba, [channel]: Number(event.target.value) };
                    applyRgba(next);
                  }}
                  onBlur={() => commit()}
                />
              ))}
              <input
                className="eu-control"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={rgba.a}
                disabled={isDisabled}
                aria-label="Alpha"
                onChange={(event) => applyRgba({ ...rgba, a: Number(event.target.value) })}
                onBlur={() => commit()}
              />
            </div>
            <Inline gap={6}>
              <input
                type="color"
                value={`#${normalized.slice(1, 7)}`}
                disabled={isDisabled}
                aria-label="Native color picker"
                onChange={(event) => {
                  const parsed = normalizeColor(event.target.value);
                  setHexDraft(parsed);
                  live(parsed);
                }}
                onBlur={() => commit()}
              />
              <IconButton
                label="Pick color from screen"
                disabled={isDisabled || !supportsEyeDropper()}
                onClick={async () => {
                  const picked = await pickColorWithEyeDropper();
                  if (!picked) return;
                  setHexDraft(picked);
                  live(picked);
                  onCommitValue(picked);
                }}
              >
                ⌖
              </IconButton>
            </Inline>
          </Stack>
        </div>
      </Popover>
      <input
        id={id}
        name={name}
        className="eu-control"
        value={draft}
        disabled={isDisabled}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => {
          setHexDraft(event.target.value);
          live(normalizeColor(event.target.value));
        }}
        onBlur={() => {
          const parsed = normalizeColor(hexDraft);
          setHexDraft(parsed);
          live(parsed);
          commit();
        }}
      />
    </Inline>
  );
}
