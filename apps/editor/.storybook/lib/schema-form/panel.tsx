import React from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { useArgs, useParameter } from 'storybook/manager-api';
import type {
  RepeaterItemField,
  RepeaterSchemaField,
  SchemaFormField,
  SchemaFormOption,
  SelectSchemaField,
  StorybookSchemaFormConfig,
} from './types';

interface SchemaFormPanelProps {
  readonly active: boolean;
  readonly parameterKey: string;
}

type Args = Record<string, unknown>;
type UpdateArgs = (args: Args) => void;

const fieldStyle = {
  display: 'grid',
  gap: 6,
  maxWidth: 520,
  fontSize: 13,
} as const;

const controlStyle = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 32,
  padding: '5px 8px',
  border: '1px solid var(--ui-color-border, #b8b8b8)',
  borderRadius: 4,
  background: 'var(--ui-color-bg, #fff)',
  color: 'var(--ui-color-fg, #222)',
  font: 'inherit',
} as const;

function getSelectOptions(field: SelectSchemaField, args: Args): readonly SchemaFormOption[] {
  if (!field.optionsFrom) return field.options ?? [];
  const dependency = args[field.optionsFrom.arg];
  return field.optionsFrom.values[String(dependency)] ?? field.options ?? [];
}

function renderInput(
  field: RepeaterItemField,
  value: unknown,
  onChange: (value: string | number | boolean) => void,
) {
  if (field.type === 'boolean') {
    return (
      <input
        aria-label={field.label}
        type="checkbox"
        checked={value === true}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  }

  if (field.type === 'select') {
    const selectedValue = typeof value === 'string' ? value : field.options[0]?.value;
    return (
      <select
        aria-label={field.label}
        style={controlStyle}
        value={selectedValue ?? ''}
        disabled={!field.options.length}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      aria-label={field.label}
      style={controlStyle}
      type={field.type === 'number' ? 'number' : 'text'}
      placeholder={field.type === 'text' ? field.placeholder : undefined}
      min={field.type === 'number' ? field.min : undefined}
      max={field.type === 'number' ? field.max : undefined}
      step={field.type === 'number' ? field.step : undefined}
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(event) => {
        if (field.type === 'number') {
          onChange(event.currentTarget.value === '' ? '' : event.currentTarget.valueAsNumber);
        } else {
          onChange(event.currentTarget.value);
        }
      }}
    />
  );
}

function renderRepeater(field: RepeaterSchemaField, value: unknown, updateArgs: UpdateArgs) {
  const items = Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object',
      )
    : [];

  const updateItem = (itemIndex: number, key: string, nextValue: string | number | boolean) => {
    updateArgs({
      [field.name]: items.map((item, index) =>
        index === itemIndex ? { ...item, [key]: nextValue } : item,
      ),
    });
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((item, itemIndex) => (
        <fieldset
          key={itemIndex}
          style={{
            display: 'grid',
            gap: 10,
            border: '1px solid #bbb',
            borderRadius: 4,
            padding: 12,
          }}
        >
          <legend>
            {field.itemLabel} {itemIndex + 1}
          </legend>
          {field.itemFields.map((itemField) => (
            <label key={itemField.name} style={fieldStyle}>
              <span>{itemField.label}</span>
              {renderInput(itemField, item[itemField.name], (nextValue) =>
                updateItem(itemIndex, itemField.name, nextValue),
              )}
            </label>
          ))}
          <button
            type="button"
            onClick={() =>
              updateArgs({ [field.name]: items.filter((_, index) => index !== itemIndex) })
            }
          >
            Remove {field.itemLabel.toLowerCase()}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        onClick={() =>
          updateArgs({
            [field.name]: [...items, structuredClone(field.createItem)],
          })
        }
      >
        Add {field.itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

function renderField(
  field: SchemaFormField,
  args: Args,
  updateArgs: UpdateArgs,
  fields: readonly SchemaFormField[],
) {
  if (field.type === 'repeater') {
    return renderRepeater(field, args[field.name], updateArgs);
  }

  const value = args[field.name];
  const onChange = (nextValue: string | number | boolean) => {
    const updates: Args = { [field.name]: nextValue };
    for (const candidate of fields) {
      if (candidate.type !== 'select') continue;
      const dependentField = candidate;
      if (dependentField.optionsFrom?.arg !== field.name) continue;
      const options = getSelectOptions(dependentField, { ...args, [field.name]: nextValue });
      updates[dependentField.name] = options[0]?.value ?? '';
    }
    updateArgs(updates);
  };

  if (field.type === 'boolean') {
    return (
      <input
        aria-label={field.label}
        type="checkbox"
        checked={value === true}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  }

  if (field.type === 'select') {
    const options = getSelectOptions(field, args);
    const selectedValue =
      typeof value === 'string' && options.some((option) => option.value === value)
        ? value
        : options[0]?.value;
    return (
      <select
        aria-label={field.label}
        style={controlStyle}
        value={selectedValue ?? ''}
        disabled={!options.length}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      aria-label={field.label}
      style={controlStyle}
      type={field.type === 'number' ? 'number' : 'text'}
      placeholder={field.type === 'text' ? field.placeholder : undefined}
      min={field.type === 'number' ? field.min : undefined}
      max={field.type === 'number' ? field.max : undefined}
      step={field.type === 'number' ? field.step : undefined}
      value={value === undefined || value === null ? '' : String(value)}
      onChange={(event) => {
        if (field.type === 'number') {
          onChange(event.currentTarget.value === '' ? '' : event.currentTarget.valueAsNumber);
        } else {
          onChange(event.currentTarget.value);
        }
      }}
    />
  );
}

export function SchemaFormPanel({ active, parameterKey }: SchemaFormPanelProps) {
  const [args, updateArgs] = useArgs();
  const config = useParameter<StorybookSchemaFormConfig | undefined>(parameterKey, undefined);

  return (
    <AddonPanel active={active}>
      {config?.fields.length ? (
        <div style={{ display: 'grid', alignContent: 'start', gap: 16, padding: 16 }}>
          {config.fields.map((field) =>
            field.type === 'repeater' ? (
              <section key={field.name} style={fieldStyle}>
                <strong>{field.label}</strong>
                {renderField(field, args, updateArgs, config.fields)}
              </section>
            ) : (
              <label key={field.name} style={fieldStyle}>
                <span>{field.label}</span>
                {renderField(field, args, updateArgs, config.fields)}
              </label>
            ),
          )}
        </div>
      ) : (
        <p style={{ padding: 16 }}>This story has no schema form configured.</p>
      )}
    </AddonPanel>
  );
}
