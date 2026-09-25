import { useEffect, useState } from 'react';
import { Combobox, Field, SegmentedControl, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';
import { shadowTokenOptions } from '../token-options.js';
import { customShadowDraft, inferShadowMode, type ShadowControlMode } from './value.js';

export function ShadowControl({
  name,
  label,
  value,
  shadowTokens,
  onCommit,
}: {
  name?: string;
  label?: string;
  value: string;
  shadowTokens: readonly string[];
  onCommit: (next: string | null) => void;
}) {
  const [mode, setMode] = useState<ShadowControlMode>(() => inferShadowMode(value));

  useEffect(() => {
    setMode(inferShadowMode(value));
  }, [value]);

  const fieldLabel = label ?? 'Shadow';

  return (
    <Stack gap={8}>
      <Field label={fieldLabel}>
        <SegmentedControl
          name={name ? `${name}-mode` : 'shadow-mode'}
          value={mode}
          options={[
            { value: 'custom', label: 'Value' },
            { value: 'token', label: 'Token' },
          ]}
          onCommit={(next) => setMode(next as ShadowControlMode)}
        />
      </Field>
      {mode === 'token' ? (
        <Field label="Token">
          <Combobox
            name={name ? `${name}-token` : 'shadow-token'}
            value={value.trim()}
            options={shadowTokenOptions(shadowTokens, value.trim())}
            onCommit={(next) => onCommit(next.trim() ? next.trim() : null)}
          />
        </Field>
      ) : (
        <Field label={fieldLabel}>
          <TextInput
            name={name}
            value={customShadowDraft(value)}
            placeholder="0 8px 24px rgba(0,0,0,0.12)"
            onCommit={(next) => onCommit(next.trim() ? next.trim() : null)}
          />
        </Field>
      )}
    </Stack>
  );
}
