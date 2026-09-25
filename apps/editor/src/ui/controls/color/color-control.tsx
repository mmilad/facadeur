import { useEffect, useState } from 'react';
import { ColorInput, Combobox, Field, SegmentedControl, Stack } from '../../form/index.js';
import '../../form/form.css';
import { colorTokenOptions } from '../token-options.js';
import { customColorDraft, inferColorMode, type ColorControlMode } from './value.js';

export function ColorControl({
  name,
  label,
  value,
  colorTokens,
  onCommit,
}: {
  name?: string;
  label?: string;
  value: string;
  colorTokens: readonly string[];
  onCommit: (next: string | null) => void;
}) {
  const [mode, setMode] = useState<ColorControlMode>(() => inferColorMode(value));

  useEffect(() => {
    setMode(inferColorMode(value));
  }, [value]);

  const fieldLabel = label ?? 'Color';

  return (
    <Stack gap={8}>
      <Field label={fieldLabel}>
        <SegmentedControl
          name={name ? `${name}-mode` : 'color-mode'}
          value={mode}
          options={[
            { value: 'custom', label: 'Color' },
            { value: 'token', label: 'Token' },
          ]}
          onCommit={(next) => setMode(next as ColorControlMode)}
        />
      </Field>
      {mode === 'token' ? (
        <Field label="Token">
          <Combobox
            name={name ? `${name}-token` : 'color-token'}
            value={value.trim()}
            options={colorTokenOptions(colorTokens, value.trim())}
            onCommit={(next) => onCommit(next.trim() ? next.trim() : null)}
          />
        </Field>
      ) : (
        <Field label={fieldLabel}>
          <ColorInput
            name={name}
            value={customColorDraft(value)}
            onCommit={(next) => onCommit(next.trim() ? next.trim() : null)}
          />
        </Field>
      )}
    </Stack>
  );
}
