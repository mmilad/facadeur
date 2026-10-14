'use client';

import { parsePropRef, type DesignPropOption } from '@facadeur/core';
import { useEffect, useState } from 'react';
import { IconButton } from '../../../../components/IconButton';
import { Inline } from '../../../../components/layout/Inline';
import { NumberInput } from './NumberInput';
import { Select } from '../selection/Select';
import { TextInput } from './TextInput';

export function PropBindableInput({
  value,
  disabled,
  ariaLabel,
  propOptions,
  kind = 'text',
  onCommit,
  showBindToggle = false,
}: {
  value: string;
  disabled?: boolean;
  ariaLabel: string;
  propOptions: readonly DesignPropOption[];
  kind?: 'text' | 'number';
  onCommit: (next: string) => void;
  /** When true, always show the `{ }` / `Aa` mode toggle (Properties inspector). */
  showBindToggle?: boolean;
}) {
  const boundUuid = parsePropRef(value);
  const hasProps = propOptions.length > 0;
  const boundOption = boundUuid ? propOptions.find((prop) => prop.uuid === boundUuid) : undefined;
  const [mode, setMode] = useState<'literal' | 'prop'>(boundUuid ? 'prop' : 'literal');

  useEffect(() => {
    setMode(parsePropRef(value) ? 'prop' : 'literal');
  }, [value]);

  if (mode === 'prop' && (showBindToggle || hasProps || boundUuid)) {
    const selectedRef =
      boundOption?.ref ?? (boundUuid ? value : hasProps ? propOptions[0]!.ref : '');
    const options = [
      ...(boundUuid && !boundOption ? [{ value, label: `Missing binding (${boundUuid})` }] : []),
      ...propOptions.map((prop) => ({ value: prop.ref, label: prop.name })),
    ];
    return (
      <Inline gap={6} className="eu-prop-bind">
        {hasProps || boundUuid ? (
          <Select
            aria-label={`${ariaLabel} prop binding`}
            value={selectedRef}
            disabled={disabled}
            options={options}
            onCommit={(next) => onCommit(next)}
          />
        ) : (
          <Select
            aria-label={`${ariaLabel} prop binding`}
            value=""
            disabled
            options={[]}
            placeholder="No props available"
          />
        )}
        <IconButton
          label="Switch to literal value"
          disabled={disabled}
          onClick={() => {
            setMode('literal');
            onCommit('');
          }}
        >
          Aa
        </IconButton>
      </Inline>
    );
  }

  return (
    <Inline gap={6} className="eu-prop-bind">
      {kind === 'number' ? (
        <NumberInput
          aria-label={ariaLabel}
          value={value === '' ? null : Number(value)}
          disabled={disabled}
          onCommit={(next) => onCommit(next === null ? '' : String(next))}
        />
      ) : (
        <TextInput aria-label={ariaLabel} value={value} disabled={disabled} onCommit={onCommit} />
      )}
      {showBindToggle || hasProps ? (
        <IconButton
          label="Bind prop"
          disabled={disabled}
          onClick={() => {
            setMode('prop');
            if (hasProps) onCommit(propOptions[0]!.ref);
          }}
        >
          {'{ }'}
        </IconButton>
      ) : null}
    </Inline>
  );
}
