import type { Spacing, SpacingBox } from '@facadeur/core';
import { Combobox, Field, Stack } from '../../form/index.js';
import { dimensionTokenOptions } from '../token-options.js';

export function boxWith(
  box: SpacingBox,
  side: keyof SpacingBox,
  value: string | null,
): SpacingBox | null {
  const next: SpacingBox = { ...box };
  if (value) next[side] = value;
  else delete next[side];
  return next.top || next.right || next.bottom || next.left ? next : null;
}

export function SpacingControl({
  legend,
  namePrefix,
  spacing,
  dimensionTokens,
  onCommit,
}: {
  legend: string;
  namePrefix: string;
  spacing: Spacing | undefined;
  dimensionTokens: readonly string[];
  onCommit: (spacing: Spacing | null) => void;
}) {
  if (spacing && typeof spacing !== 'string') {
    return (
      <Stack gap={8}>
        <span className="eu-field__hint">{legend} per side</span>
        {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
          <Field key={side} label={side}>
            <Combobox
              name={`${namePrefix}-${side}`}
              value={spacing[side] ?? ''}
              options={dimensionTokenOptions(dimensionTokens, spacing[side])}
              onCommit={(next) => onCommit(boxWith(spacing, side, next || null))}
            />
          </Field>
        ))}
        <button
          type="button"
          className="text-button"
          onClick={() =>
            onCommit(spacing.top ?? spacing.right ?? spacing.bottom ?? spacing.left ?? null)
          }
        >
          One token
        </button>
      </Stack>
    );
  }

  const tokenValue = typeof spacing === 'string' ? spacing : undefined;
  return (
    <Stack gap={8}>
      <Field label={legend}>
        <Combobox
          name={namePrefix}
          value={tokenValue ?? ''}
          options={dimensionTokenOptions(dimensionTokens, tokenValue)}
          onCommit={(next) => onCommit(next || null)}
        />
      </Field>
      {spacing ? (
        <button
          type="button"
          className="text-button"
          onClick={() =>
            onCommit({
              top: spacing,
              right: spacing,
              bottom: spacing,
              left: spacing,
            })
          }
        >
          Per side
        </button>
      ) : null}
    </Stack>
  );
}
