'use client';

import { encodePropRef, parsePropRef, type DesignPropOption } from '@facadeur/core';
import { useEffect, useState } from 'react';
import { IconButton } from '../shared/IconButton';
import { Inline } from '../layout/Inline';
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
  const [mode, setMode] = useState<'literal' | 'prop'>(boundUuid ? 'prop' : 'literal');

  useEffect(() => {
    setMode(parsePropRef(value) ? 'prop' : 'literal');
  }, [value]);

  if (mode === 'prop' && (showBindToggle || hasProps)) {
    const selectedRef =
      boundUuid && hasProps
        ? (propOptions.find((prop) => prop.uuid === boundUuid)?.ref ?? encodePropRef(boundUuid))
        : hasProps
          ? propOptions[0]!.ref
          : '';
    return (
      <Inline gap={6} className="eu-prop-bind">
        {hasProps ? (
          <Select
            aria-label={`${ariaLabel} prop binding`}
            value={selectedRef}
            disabled={disabled}
            options={propOptions.map((prop) => ({
              value: prop.ref,
              label: prop.name,
            }))}
            onCommit={(next) => onCommit(next)}
          />
        ) : (
          <select className="eu-control" disabled aria-label={`${ariaLabel} prop binding`}>
            <option value="">No props available</option>
          </select>
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
