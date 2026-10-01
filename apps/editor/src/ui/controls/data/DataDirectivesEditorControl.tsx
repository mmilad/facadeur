import {
  findParent,
  type DisplayOn,
  type FieldDefinition,
  type FieldValue,
  type FlatDocument,
  type FlatNode,
  type Repeat,
} from '@facadeur/core';
import { Field, NumberInput, Section, Select, Stack, TextInput } from '../../form/index.js';
import '../../form/form.css';
import { fieldDisplayLabel } from './field-label.js';

export type PathOption = { value: string; label: string; field: FieldDefinition };
type DisplayMode = 'truthy' | 'equals';

export type DataPathOption = Pick<PathOption, 'value' | 'label'>;

export function DataDirectivesEditorControl({
  node,
  fields,
  onChangeDisplayOn,
  onChangeRepeat,
  onInvalid,
}: {
  node: Exclude<FlatNode, { type: 'instance' }>;
  fields: FieldDefinition[];
  onChangeDisplayOn: (value: DisplayOn | null) => void;
  onChangeRepeat: (value: Repeat | null) => void;
  onInvalid?: (message: string) => void;
}) {
  const paths = fieldPathOptions(fields);
  return (
    <Stack gap={12}>
      <DisplayConditionEditor
        condition={node.displayOn}
        paths={paths}
        onChange={onChangeDisplayOn}
        onInvalid={onInvalid}
      />
      {node.type === 'frame' ? (
        <RepeatEditor
          repeat={node.repeat}
          paths={paths}
          onChange={onChangeRepeat}
          onInvalid={onInvalid}
        />
      ) : null}
    </Stack>
  );
}

/** Return the fields visible at a node, including aliases from ancestor repeaters. */
export function dataFieldsForNode(document: FlatDocument, nodeId: string): FieldDefinition[] {
  const ancestors: FlatNode[] = [];
  let currentId = nodeId;
  while (true) {
    const parent = findParent(document, currentId);
    if (!parent) break;
    ancestors.unshift(parent);
    currentId = parent.id;
  }

  const fields = new Map(document.fields.map((field) => [field.name, field]));
  for (const ancestor of ancestors) {
    if (ancestor.type !== 'frame' || !ancestor.repeat) continue;
    const source = findField(fieldPathOptions([...fields.values()]), ancestor.repeat.path);
    const alias = ancestor.repeat.as ?? 'item';
    const itemFields = source?.items?.fields;
    fields.set(
      alias,
      itemFields
        ? { name: alias, type: 'object', items: { type: 'object', fields: itemFields } }
        : { name: alias, type: source?.items?.type ?? 'text' },
    );
  }
  return [...fields.values()];
}

export function dataPathOptions(fields: FieldDefinition[]): DataPathOption[] {
  return fieldPathOptions(fields).map(({ value, label }) => ({ value, label }));
}

export function DisplayConditionEditor({
  condition,
  paths,
  onChange,
  onInvalid,
  namePrefix = '',
  title = 'Display condition',
}: {
  condition?: DisplayOn;
  paths: PathOption[];
  onChange: (value: DisplayOn | null) => void;
  onInvalid?: (message: string) => void;
  namePrefix?: string;
  title?: string;
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
      ) : paths.length === 0 ? (
        <p className="meta">Define a field before adding a display condition.</p>
      ) : (
        <>
          <Field label="Field">
            <Select
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
          <button
            type="button"
            className="text-button"
            name={`${namePrefix}remove-display-condition`}
            onClick={() => onChange(null)}
          >
            Remove condition
          </button>
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
  return (
    <Field label="Value">
      <TextInput
        name={`${namePrefix}display-condition-value`}
        value={displayValue(value)}
        onCommit={(next) => onChange(next)}
      />
    </Field>
  );
}

function RepeatEditor({
  repeat,
  paths,
  onChange,
  onInvalid,
}: {
  repeat?: Repeat;
  paths: PathOption[];
  onChange: (value: Repeat | null) => void;
  onInvalid?: (message: string) => void;
}) {
  const arrayPaths = paths.filter((option) => option.field.type === 'array');
  const path = repeat?.path ?? arrayPaths[0]?.value ?? '';
  const source = findField(paths, path);
  const keyOptions = source?.items?.fields
    ? fieldPathOptions(source.items.fields).filter(({ field }) => isScalarField(field))
    : [];
  const visibleKeyOptions = withMissingOption(keyOptions, repeat?.key ?? '');

  return (
    <Section title="Repeat" collapsible defaultOpen>
      {!repeat ? (
        <button
          type="button"
          className="text-button"
          name="add-repeat"
          disabled={arrayPaths.length === 0}
          onClick={() => {
            if (path) onChange({ path });
          }}
        >
          Add repeat
        </button>
      ) : arrayPaths.length === 0 ? (
        <p className="meta">Define an array field before adding a repeat.</p>
      ) : (
        <>
          <Field label="Array">
            <Select
              name="repeat-path"
              value={path}
              options={withMissingOption(arrayPaths, path).map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onCommit={(nextPath) => {
                const nextSource = findField(paths, nextPath);
                const nextKey = nextSource?.items?.fields
                  ? fieldPathOptions(nextSource.items.fields).some(
                      (option) => option.value === repeat.key,
                    )
                    ? repeat.key
                    : undefined
                  : undefined;
                const nextRepeat = { ...repeat, path: nextPath };
                delete nextRepeat.key;
                if (nextKey) nextRepeat.key = nextKey;
                onChange(nextRepeat);
              }}
            />
          </Field>
          <Field label="Item alias">
            <TextInput
              name="repeat-alias"
              value={repeat.as ?? ''}
              placeholder="item"
              onCommit={(raw) => {
                const as = raw.trim();
                if (as && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(as)) {
                  onInvalid?.('Item aliases start with a letter and use letters, numbers, _ or -');
                  return;
                }
                const nextRepeat = { ...repeat };
                delete nextRepeat.as;
                if (as) nextRepeat.as = as;
                onChange(nextRepeat);
              }}
            />
          </Field>
          {keyOptions.length ? (
            <Field label="Key">
              <Select
                name="repeat-key"
                value={repeat.key ?? ''}
                options={[
                  { value: '', label: 'Index' },
                  ...visibleKeyOptions.filter((option) => option.value),
                ]}
                onCommit={(key) => {
                  const nextRepeat = { ...repeat };
                  delete nextRepeat.key;
                  if (key) nextRepeat.key = key;
                  onChange(nextRepeat);
                }}
              />
            </Field>
          ) : null}
          <button
            type="button"
            className="text-button"
            name="remove-repeat"
            onClick={() => onChange(null)}
          >
            Remove repeat
          </button>
        </>
      )}
    </Section>
  );
}

export function fieldPathOptions(fields: FieldDefinition[], prefix = ''): PathOption[] {
  return fields.flatMap((field) => {
    const value = prefix ? `${prefix}.${field.name}` : field.name;
    const option: PathOption = { value, label: fieldDisplayLabel(value), field };
    const nested =
      field.type === 'object' && field.items?.fields
        ? fieldPathOptions(field.items.fields, value)
        : [];
    return [option, ...nested];
  });
}

function findField(paths: PathOption[], path: string): FieldDefinition | undefined {
  return paths.find((option) => option.value === path)?.field;
}

function isScalarField(field: FieldDefinition): boolean {
  return field.type !== 'array' && field.type !== 'object';
}

function withMissingOption(options: PathOption[], value: string): PathOption[] {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ value, label: `Missing: ${value}`, field: { name: value, type: 'text' } }, ...options];
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
