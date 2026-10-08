import {
  findParent,
  type DisplayOn,
  type FieldDefinition,
  type FlatDocument,
  type FlatNode,
  type Repeat,
  type ContractResolverInput,
} from '@facadeur/core';
import { structuralScopeFields } from '@facadeur/core';
import { Field, Section, Select, Stack, TextInput } from '../../form/index';
import '../../form/form.css';
import { DisplayConditionEditor } from './DisplayConditionEditor';
import {
  fieldPathOptions,
  findField,
  isScalarField,
  withMissingOption,
  type PathOption,
} from './field-paths';
export { DisplayConditionEditor } from './DisplayConditionEditor';
export { fieldPathOptions, type PathOption } from './field-paths';

export type DataPathOption = Pick<PathOption, 'value' | 'label'>;

export function DataDirectivesEditorControl({
  node,
  fields,
  onChangeDisplayOn,
  onChangeRepeat,
  onInvalid,
  conditionTitle = 'Display condition',
}: {
  node: Extract<FlatNode, { type: 'frame' | 'text' | 'image' }>;
  fields: FieldDefinition[];
  onChangeDisplayOn: (value: DisplayOn | null) => void;
  onChangeRepeat: (value: Repeat | null) => void;
  onInvalid?: (message: string) => void;
  conditionTitle?: string;
}) {
  const paths = fieldPathOptions(fields);
  return (
    <Stack gap={12}>
      <DisplayConditionEditor
        title={conditionTitle}
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
export function dataFieldsForNode(
  document: FlatDocument,
  nodeId: string,
  documentFields: readonly FieldDefinition[] = document.fields,
  includeSelf = false,
  context?: ContractResolverInput,
  inheritedFields?: readonly FieldDefinition[],
): FieldDefinition[] {
  const ancestors: FlatNode[] = [];
  if (includeSelf && document.nodes[nodeId]) ancestors.push(document.nodes[nodeId]!);
  let currentId = nodeId;
  while (true) {
    const parent = findParent(document, currentId);
    if (!parent) break;
    ancestors.unshift(parent);
    currentId = parent.id;
  }

  const scopedFields = context
    ? structuralScopeFields(document, nodeId, context, inheritedFields)
    : documentFields;
  const fields = new Map(scopedFields.map((field) => [field.name, field]));
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
