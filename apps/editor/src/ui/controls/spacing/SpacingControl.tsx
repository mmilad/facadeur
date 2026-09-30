import type { Spacing, SpacingBox } from '@facadeur/core';
import { useEffect, useState } from 'react';
import { Grid, Stack } from '../../form/index.js';
import { TokenValueControl } from '../fields/TokenValueControl.js';

export function boxWith(
  box: SpacingBox,
  side: keyof SpacingBox,
  value: string | null,
): SpacingBox | null {
  const next: SpacingBox = { ...box };
  const trimmed = value?.trim() ?? '';
  if (trimmed) next[side] = trimmed;
  else delete next[side];
  return next.top || next.right || next.bottom || next.left ? next : null;
}

function asBox(spacing: Spacing | undefined): SpacingBox {
  if (spacing && typeof spacing !== 'string') return spacing;
  const value = typeof spacing === 'string' ? spacing : undefined;
  if (!value) return {};
  return { top: value, right: value, bottom: value, left: value };
}

function uniformBoxValue(box: SpacingBox): string | null {
  const values = [box.top ?? '', box.right ?? '', box.bottom ?? '', box.left ?? ''].map((value) =>
    value.trim(),
  );
  const first = values[0] ?? '';
  return values.every((value) => value === first) ? first : null;
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
  const [showSides, setShowSides] = useState(() => Boolean(spacing && typeof spacing !== 'string'));
  useEffect(() => {
    if (spacing && typeof spacing !== 'string') setShowSides(true);
    else if (spacing === undefined) setShowSides(false);
  }, [spacing]);
  const box = asBox(spacing);

  if (showSides || Boolean(spacing && typeof spacing !== 'string')) {
    const uniform = uniformBoxValue(box);
    return (
      <Stack gap={8}>
        <span className="eu-field__hint">{legend} per side</span>
        <Grid columns={2}>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <TokenValueControl
              key={side}
              name={`${namePrefix}-${side}`}
              label={side}
              value={box[side] ?? ''}
              tokens={dimensionTokens}
              tokenOnly
              placeholder="None"
              onCommit={(next) => onCommit(boxWith(box, side, next))}
            />
          ))}
        </Grid>
        {uniform !== null ? (
          <button
            type="button"
            className="text-button eu-mode-action"
            onClick={() => {
              setShowSides(false);
              onCommit(uniform || null);
            }}
          >
            One value
          </button>
        ) : (
          <span className="eu-field__hint">Sides differ; keep them separate.</span>
        )}
      </Stack>
    );
  }

  const tokenValue = typeof spacing === 'string' ? spacing : '';
  return (
    <Stack gap={8}>
      <TokenValueControl
        name={namePrefix}
        label={legend}
        value={tokenValue}
        tokens={dimensionTokens}
        tokenOnly
        placeholder="None"
        onCommit={(next) => onCommit(next)}
      />
      <button
        type="button"
        className="text-button eu-mode-action"
        onClick={() => setShowSides(true)}
      >
        Per side
      </button>
    </Stack>
  );
}
