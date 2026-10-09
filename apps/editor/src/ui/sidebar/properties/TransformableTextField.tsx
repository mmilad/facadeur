import { useState } from 'react';
import { ColorField, SelectField, TextField, type AutocompleteOption } from '@facadeur/form';
import { IconButton } from '../../form/components/shared/IconButton';
import { Popover } from '../../form/components/overlay/Popover';
import styles from './TransformableTextField.module.css';

type TransformMode = 'text' | 'props' | 'token' | 'color';

export function TransformableTextField({
  id,
  name,
  value,
  propOptions,
  tokenOptions,
  colorable,
  disabled,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  propOptions: readonly AutocompleteOption[];
  tokenOptions: readonly AutocompleteOption[];
  colorable: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [mode, setMode] = useState<TransformMode>(() => modeFromValue(value));
  const [transformOpen, setTransformOpen] = useState(false);
  const inferredMode = modeFromValue(value);
  const activeMode = inferredMode === 'text' ? mode : inferredMode;
  const modes: { id: TransformMode; label: string }[] = [
    { id: 'text', label: 'Text' },
    ...(propOptions.length || inferredMode === 'props'
      ? [{ id: 'props' as const, label: 'Component prop' }]
      : []),
    ...(tokenOptions.some(isStableTokenOption) || inferredMode === 'token'
      ? [{ id: 'token' as const, label: 'CSS token' }]
      : []),
    ...(colorable ? [{ id: 'color' as const, label: 'Color' }] : []),
  ];
  const canTransform = modes.length > 1;

  function chooseMode(next: TransformMode) {
    setMode(next);
    if (inferredMode !== 'text' && inferredMode !== next) {
      onChange(next === 'color' ? '#000000' : '');
    }
  }

  const currentOptions =
    activeMode === 'props' ? propOptions : tokenOptions.filter(isStableTokenOption);
  const currentValue =
    currentOptions.some((option) => option.value === value) || inferredMode === activeMode
      ? value
      : '';
  const selectOptions = [
    { value: '', label: activeMode === 'props' ? 'Choose a prop…' : 'Choose a token…' },
    ...currentOptions.map(({ value: optionValue, label }) => ({ value: optionValue, label })),
    ...(value && !currentOptions.some((option) => option.value === value)
      ? [{ value, label: activeMode === 'props' ? 'Unavailable prop' : 'Unavailable token' }]
      : []),
  ];

  return (
    <div className={styles.root}>
      {activeMode === 'props' || activeMode === 'token' ? (
        <SelectField
          id={id}
          name={name}
          value={currentValue}
          options={selectOptions}
          disabled={disabled}
          onChange={onChange}
        />
      ) : activeMode === 'color' ? (
        <ColorField
          id={id}
          name={name}
          value={isColorValue(value) ? normalizeColor(value) : '#000000'}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <TextField id={id} name={name} value={value} disabled={disabled} onChange={onChange} />
      )}
      {canTransform ? (
        <Popover
          open={transformOpen}
          onOpenChange={setTransformOpen}
          trigger={
            <IconButton label="Transform to" disabled={disabled}>
              ⇄
            </IconButton>
          }
        >
          <div className={styles.menu} role="menu" aria-label="Transform field to">
            {modes.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === activeMode}
                disabled={disabled}
                onClick={() => {
                  chooseMode(option.id);
                  setTransformOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Popover>
      ) : null}
    </div>
  );
}

function modeFromValue(value: string): TransformMode {
  if (/^\{props:[^{}]+\}$/.test(value)) return 'props';
  if (/^\{token:[^{}]+\}$/.test(value)) return 'token';
  return 'text';
}

function isStableTokenOption(option: AutocompleteOption) {
  return /^\{token:[^{}]+\}$/.test(option.value);
}

function isColorValue(value: string) {
  return /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value);
}

function normalizeColor(value: string) {
  if (value.length === 4) {
    return `#${[...value.slice(1)].map((digit) => `${digit}${digit}`).join('')}`;
  }
  return value;
}
