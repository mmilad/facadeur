import type { AxisSize, SizeValue } from '@facadeur/core';
import { Field, Grid, NumberInput, Section, Select, Stack } from '../../form/index';
import { TokenValueControl } from '../fields/TokenValueControl';

const SIZE_MODES = [
  { value: '', label: 'Inherit' },
  { value: 'auto', label: 'Auto' },
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
  if (mode !== 'auto' && mode !== 'hug' && mode !== 'fill' && mode !== 'fixed') return null;
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
    <Grid columns={kind === '' ? 1 : 2}>
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
        <Field label="Pixels">
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
        <TokenValueControl
          name={name}
          label="Token"
          value={typeof value === 'string' ? value : ''}
          tokens={dimensionTokens}
          tokenOnly
          placeholder="Select…"
          onCommit={(next) => {
            if (next) onCommit(next);
          }}
        />
      ) : null}
      {kind === 'percent' ? (
        <Field label="Percent">
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
    </Grid>
  );
}

export function AxisSizeEditor({
  label,
  name,
  axis,
  dimensionTokens,
  onCommit,
  modeValue,
  customValue,
}: {
  label: string;
  name: 'width' | 'height';
  axis: AxisSize | undefined;
  dimensionTokens: readonly string[];
  onCommit: (axis: AxisSize | null) => void;
  modeValue?: AxisSize['mode'] | '' | 'custom';
  customValue?: string;
}) {
  const mode =
    modeValue === '' ? '' : customValue !== undefined ? 'custom' : (modeValue ?? axis?.mode ?? '');
  const inherited = modeValue === '';
  const effectiveMode = SIZE_MODES.find((option) => option.value === axis?.mode)?.label;

  function rebuild(next: AxisSize | null) {
    onCommit(next);
  }

  return (
    <Stack gap={8}>
      <Field label={label}>
        <Select
          name={`layout-${name}`}
          aria-label={label}
          value={mode}
          options={[
            ...SIZE_MODES.map((option) => ({ ...option })),
            ...(customValue !== undefined || mode === 'custom'
              ? [{ value: 'custom', label: 'Custom CSS', disabled: true }]
              : []),
          ]}
          onCommit={(value) => rebuild(axisModePatch(value, axis))}
        />
        {inherited && (customValue !== undefined || axis) ? (
          <span className="eu-field__hint">
            Inherited {name}: {customValue ?? effectiveMode}
          </span>
        ) : null}
        {customValue !== undefined ? (
          <span className="eu-field__hint">
            {inherited ? 'Inherited custom CSS' : 'Custom CSS'}: {customValue}. Edit in Manual CSS.
          </span>
        ) : null}
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
      <Section
        title="Min / max"
        collapsible
        defaultOpen={Boolean(axis?.min !== undefined || axis?.max !== undefined)}
      >
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
      </Section>
    </Stack>
  );
}
