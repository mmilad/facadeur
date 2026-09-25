import type { AxisSize, SizeValue } from '@facadeur/core';
import { Combobox, Field, NumberInput, Select, Stack } from '../../form/index.js';
import { dimensionTokenOptions } from '../token-options.js';

const SIZE_MODES = [
  { value: '', label: 'Default' },
  { value: 'hug', label: 'Hug' },
  { value: 'fill', label: 'Fill' },
  { value: 'fixed', label: 'Fixed' },
] as const;

const SIZE_KINDS = [
  { value: '', label: 'None' },
  { value: 'px', label: 'px' },
  { value: 'token', label: 'Token' },
  { value: 'percent', label: '%' },
] as const;

export function axisModePatch(mode: string, axis: AxisSize | undefined): AxisSize | null {
  if (mode !== 'hug' && mode !== 'fill' && mode !== 'fixed') return null;
  if (mode === 'fixed') {
    return {
      mode: 'fixed',
      size: axis?.mode === 'fixed' && axis.size !== undefined ? axis.size : 100,
      ...(axis?.min !== undefined ? { min: axis.min } : {}),
      ...(axis?.max !== undefined ? { max: axis.max } : {}),
    };
  }
  return {
    mode,
    ...(axis?.min !== undefined ? { min: axis.min } : {}),
    ...(axis?.max !== undefined ? { max: axis.max } : {}),
  };
}

function sizeKind(value: SizeValue | undefined): '' | 'px' | 'token' | 'percent' {
  if (value === undefined) return '';
  if (typeof value === 'number') return 'px';
  if (typeof value === 'string') return 'token';
  return 'percent';
}

function SizeValueEditor({
  label,
  name,
  value,
  dimensionTokens,
  allowEmpty,
  onCommit,
}: {
  label: string;
  name: string;
  value: SizeValue | undefined;
  dimensionTokens: readonly string[];
  allowEmpty: boolean;
  onCommit: (value: SizeValue | null) => void;
}) {
  const kind = sizeKind(value);
  const tokenValue = typeof value === 'string' ? value : (dimensionTokens[0] ?? '');
  const pxValue = typeof value === 'number' ? value : 100;
  const percentValue = typeof value === 'object' ? value.value : 100;
  const kindOptions = allowEmpty ? SIZE_KINDS : SIZE_KINDS.filter((option) => option.value !== '');

  return (
    <Stack gap={8}>
      <Field label={label}>
        <Select
          name={`${name}-kind`}
          value={kind}
          options={kindOptions.map((option) => ({ ...option }))}
          onCommit={(next) => {
            if (next === '') onCommit(null);
            else if (next === 'px') onCommit(pxValue > 0 ? pxValue : 100);
            else if (next === 'token') {
              if (tokenValue) onCommit(tokenValue);
            } else onCommit({ unit: '%', value: percentValue > 0 ? percentValue : 100 });
          }}
        />
      </Field>
      {kind === 'px' ? (
        <Field label="px">
          <NumberInput
            name={name}
            value={pxValue}
            onCommit={(next) => {
              if (next !== null && next > 0) onCommit(next);
            }}
          />
        </Field>
      ) : null}
      {kind === 'token' ? (
        <Field label="Token">
          <Combobox
            name={name}
            value={typeof value === 'string' ? value : ''}
            options={dimensionTokenOptions(
              dimensionTokens,
              typeof value === 'string' ? value : undefined,
              'Select…',
            ).filter((option) => option.value !== '')}
            onCommit={(next) => {
              if (next) onCommit(next);
            }}
          />
        </Field>
      ) : null}
      {kind === 'percent' ? (
        <Field label="%">
          <NumberInput
            name={name}
            value={percentValue}
            min={0}
            max={100}
            onCommit={(next) => {
              if (next !== null && next > 0 && next <= 100) onCommit({ unit: '%', value: next });
            }}
          />
        </Field>
      ) : null}
    </Stack>
  );
}

export function AxisSizeEditor({
  label,
  name,
  axis,
  dimensionTokens,
  onCommit,
}: {
  label: string;
  name: 'width' | 'height';
  axis: AxisSize | undefined;
  dimensionTokens: readonly string[];
  onCommit: (axis: AxisSize | null) => void;
}) {
  const mode = axis?.mode ?? '';

  function rebuild(next: AxisSize | null) {
    onCommit(next);
  }

  return (
    <Stack gap={8}>
      <Field label={label}>
        <Select
          name={`layout-${name}`}
          value={mode}
          options={SIZE_MODES.map((option) => ({ ...option }))}
          onCommit={(value) => rebuild(axisModePatch(value, axis))}
        />
      </Field>
      {mode === 'fixed' ? (
        <SizeValueEditor
          label={`${label} size`}
          name={`layout-${name}-size`}
          value={axis?.size}
          dimensionTokens={dimensionTokens}
          allowEmpty={false}
          onCommit={(size) => {
            if (size === null) return;
            rebuild({
              mode: 'fixed',
              size,
              ...(axis?.min !== undefined ? { min: axis.min } : {}),
              ...(axis?.max !== undefined ? { max: axis.max } : {}),
            });
          }}
        />
      ) : null}
      <SizeValueEditor
        label={`Min ${label.toLowerCase()}`}
        name={`layout-${name}-min`}
        value={axis?.min}
        dimensionTokens={dimensionTokens}
        allowEmpty
        onCommit={(min) => {
          if (!axis) {
            if (min === null) return;
            rebuild({ mode: 'hug', min });
            return;
          }
          const next: AxisSize = {
            mode: axis.mode,
            ...(axis.size !== undefined ? { size: axis.size } : {}),
          };
          if (min !== null) next.min = min;
          if (axis.max !== undefined) next.max = axis.max;
          rebuild(next);
        }}
      />
      <SizeValueEditor
        label={`Max ${label.toLowerCase()}`}
        name={`layout-${name}-max`}
        value={axis?.max}
        dimensionTokens={dimensionTokens}
        allowEmpty
        onCommit={(max) => {
          if (!axis) {
            if (max === null) return;
            rebuild({ mode: 'hug', max });
            return;
          }
          const next: AxisSize = {
            mode: axis.mode,
            ...(axis.size !== undefined ? { size: axis.size } : {}),
          };
          if (axis.min !== undefined) next.min = axis.min;
          if (max !== null) next.max = max;
          rebuild(next);
        }}
      />
    </Stack>
  );
}
