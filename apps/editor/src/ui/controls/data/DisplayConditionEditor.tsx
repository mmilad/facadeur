import type { DisplayOn, FieldDefinition, FieldValue } from '@facadeur/core';
import { Field, NumberInput, Section, Select, TextInput } from '../../form/index';
import { findField, isScalarField, withMissingOption, type PathOption } from './field-paths';
type DisplayMode = 'truthy' | 'equals';

export function DisplayConditionEditor({
  condition,
  paths,
  onChange,
  onInvalid,
  namePrefix = '',
  title = 'Display condition',
  removable = true,
  emptyHint,
}: {
  condition?: DisplayOn;
  paths: PathOption[];
  onChange: (value: DisplayOn | null) => void;
  onInvalid?: (message: string) => void;
  namePrefix?: string;
  title?: string;
  removable?: boolean;
  emptyHint?: string;
}) {
  const path = condition?.path ?? paths[0]?.value ?? '';
  const field = findField(paths, path);
  const mode: DisplayMode = condition && 'equals' in condition ? 'equals' : 'truthy';
  const equalityAvailable = !field || isScalarField(field);
  let truthy = true;
  let equals: FieldValue | undefined;
  if (condition) {
    if ('truthy' in condition) truthy = condition.truthy;
    else equals = condition.equals;
  }
  const pathOptions = withMissingOption(paths, path);

  return (
    <Section title={title} collapsible defaultOpen>
      {!condition ? (
        <>
          <p className="meta">
            {emptyHint ?? 'Always rendered. Add a condition to render only when it matches.'}
          </p>
          <button
            type="button"
            className="text-button"
            name="add-display-condition"
            disabled={paths.length === 0}
            onClick={() => {
              if (path) onChange({ path, truthy: true });
            }}
          >
            Add condition
          </button>
          {paths.length === 0 ? (
            <p className="meta">Define a field in Schema to add a condition.</p>
          ) : null}
        </>
      ) : (
        <>
          {!field ? (
            <p className="meta">
              This condition refers to a missing field. Choose another field or remove it.
            </p>
          ) : null}
          <Field label="Field">
            <Select
              aria-label="Field"
              name={`${namePrefix}display-condition-path`}
              value={path}
              options={pathOptions.map((option) => ({ value: option.value, label: option.label }))}
              onCommit={(nextPath) => {
                const nextField = findField(paths, nextPath);
                const nextMode =
                  mode === 'equals' && nextField && !isScalarField(nextField) ? 'truthy' : mode;
                onChange(conditionForField(nextPath, nextField, nextMode, condition));
              }}
            />
          </Field>
          <Field label="When">
            <Select
              aria-label="When"
              name={`${namePrefix}display-condition-mode`}
              value={mode}
              options={[
                { value: 'truthy', label: 'Value is truthy' },
                ...(equalityAvailable ? [{ value: 'equals', label: 'Value equals' }] : []),
              ]}
              onCommit={(nextMode) => {
                const nextField = findField(paths, path);
                const mode: DisplayMode = nextMode === 'equals' ? 'equals' : 'truthy';
                if (mode === 'equals' && nextField && !isScalarField(nextField)) return;
                onChange(conditionForField(path, nextField, mode, condition));
              }}
            />
          </Field>
          {mode === 'truthy' ? (
            <Field label="Truthy">
              <Select
                aria-label="Truthy"
                name={`${namePrefix}display-condition-truthy`}
                value={String(truthy)}
                options={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
                onCommit={(value) => onChange({ path, truthy: value === 'true' })}
              />
            </Field>
          ) : (
            <DisplayValueField
              field={field}
              value={equals}
              onChange={(value) => onChange({ path, equals: value })}
              onInvalid={onInvalid}
              namePrefix={namePrefix}
            />
          )}
          {removable ? (
            <button
              type="button"
              className="text-button"
              name={`${namePrefix}remove-display-condition`}
              onClick={() => onChange(null)}
            >
              Remove condition
            </button>
          ) : null}
        </>
      )}
    </Section>
  );
}

function DisplayValueField({
  field,
  value,
  onChange,
  onInvalid,
  namePrefix = '',
}: {
  field?: FieldDefinition;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
  onInvalid?: (message: string) => void;
  namePrefix?: string;
}) {
  if (field?.type === 'boolean') {
    return (
      <Field label="Value">
        <Select
          aria-label="Value"
          name={`${namePrefix}display-condition-value`}
          value={String(value ?? false)}
          options={[
            { value: 'true', label: 'True' },
            { value: 'false', label: 'False' },
          ]}
          onCommit={(next) => onChange(next === 'true')}
        />
      </Field>
    );
  }
  if (field?.type === 'number') {
    return (
      <Field label="Value">
        <NumberInput
          aria-label="Value"
          name={`${namePrefix}display-condition-value`}
          value={typeof value === 'number' ? value : 0}
          onCommit={(next) => {
            if (next === null) {
              onInvalid?.('A number is required for this condition');
              return;
            }
            onChange(next);
          }}
        />
      </Field>
    );
  }
  if (field?.type === 'enum') {
    const selected = typeof value === 'string' ? value : '';
    const options = field.options ?? [];
    return (
      <Field label="Value">
        <Select
          aria-label="Value"
          name={`${namePrefix}display-condition-value`}
          value={selected}
          options={[
            ...(!options.includes(selected)
              ? [{ value: selected, label: `Missing: ${selected}` }]
              : []),
            ...options.map((option) => ({ value: option, label: option })),
          ]}
          onCommit={onChange}
        />
      </Field>
    );
  }
  return (
    <Field label="Value">
      <TextInput
        aria-label="Value"
        name={`${namePrefix}display-condition-value`}
        value={displayValue(value)}
        onCommit={(next) => onChange(next)}
      />
    </Field>
  );
}

function conditionForField(
  path: string,
  field: FieldDefinition | undefined,
  mode: DisplayMode,
  previous?: DisplayOn,
): DisplayOn {
  if (mode === 'truthy') {
    let nextTruthy = true;
    if (previous && 'truthy' in previous) nextTruthy = previous.truthy;
    return { path, truthy: nextTruthy };
  }
  const sameField = previous?.path === path;
  let nextEquals = defaultConditionValue(field);
  if (sameField && previous && 'equals' in previous) nextEquals = previous.equals;
  return {
    path,
    equals: nextEquals,
  };
}

function defaultConditionValue(field?: FieldDefinition): FieldValue {
  if (field?.default !== undefined && !Array.isArray(field.default)) return field.default;
  if (field?.type === 'boolean') return false;
  if (field?.type === 'number') return 0;
  if (field?.type === 'enum') return field.options?.[0] ?? '';
  return '';
}

function displayValue(value: FieldValue | undefined): string {
  if (typeof value === 'string') return value;
  return value === undefined ? '' : JSON.stringify(value);
}
