'use client';

import { useState } from 'react';
import type {
  BehaviorAction,
  BehaviorValue,
  ComponentBehavior,
  FieldValue,
  JsonSchemaObject,
  Node,
  NodeClassDefinition,
  NodeDefinition,
} from '@facadeur/domain';
import {
  asRecord,
  assignUniqueKeys,
  defaultForType,
  hasUniqueKeys,
  isObjectList,
  isRecord,
  isStateName,
  objectListSchema,
  ObjectListStateEditor,
  stringListSchema,
} from './CatalogBehaviorObjectList';
import type { ItemField, ItemRecord } from './CatalogBehaviorObjectList';
import { Field } from '../components/feedback';
import { Inline, Stack } from '../components/layout';
import { ArrayField, NumberInput, Select, TextInput, Toggle } from '../controls/form-binding';

type StateType = 'boolean' | 'string' | 'number' | 'string-list' | 'object-list';
type StateEntry = [string, FieldValue | null];

const typeOptions = [
  { value: 'boolean', label: 'Boolean' },
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'string-list', label: 'List of text items' },
  { value: 'object-list', label: 'List of objects' },
];
export function CatalogBehaviorStates({
  definition,
  behavior,
  onChange,
}: {
  definition: NodeDefinition;
  behavior: ComponentBehavior;
  onChange: (next: ComponentBehavior) => void;
}) {
  const [stateName, setStateName] = useState('open');
  const [stateType, setStateType] = useState<StateType>('boolean');
  const [initialString, setInitialString] = useState('');
  const [initialNumber, setInitialNumber] = useState(0);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const states = Object.entries(behavior.state ?? {});
  const setState = (state: Record<string, FieldValue | null>) => onChange({ ...behavior, state });
  const addState = () => {
    const name = stateName.trim();
    if (!isStateName(name) || Object.hasOwn(behavior.state ?? {}, name)) return;
    const initial: FieldValue =
      stateType === 'boolean'
        ? false
        : stateType === 'number'
          ? initialNumber
          : stateType === 'string-list' || stateType === 'object-list'
            ? []
            : initialString;
    const schema = stateType === 'string-list' ? stringListSchema() : objectListSchema();
    onChange({
      ...behavior,
      state: { ...(behavior.state ?? {}), [name]: initial },
      ...(stateType === 'string-list' || stateType === 'object-list'
        ? {
            stateSchema: {
              ...(behavior.stateSchema ?? {}),
              [name]: schema,
            },
          }
        : {}),
      ...(stateType === 'object-list'
        ? { stateArrayKeyPaths: { ...(behavior.stateArrayKeyPaths ?? {}), [name]: 'id' } }
        : {}),
    });
    setStateName('');
  };
  const updateState = (name: string, value: FieldValue | null) =>
    setState({ ...(behavior.state ?? {}), [name]: value });
  const renameState = (name: string, nextName: string) => {
    const normalized = nextName.trim();
    if (
      !isStateName(normalized) ||
      normalized === name ||
      Object.hasOwn(behavior.state ?? {}, normalized)
    )
      return;
    onChange({
      ...behavior,
      state: Object.fromEntries(
        states.map(([key, value]) => [key === name ? normalized : key, value]),
      ),
      stateSchema: Object.fromEntries(
        Object.entries(behavior.stateSchema ?? {}).map(([key, value]) => [
          key === name ? normalized : key,
          value,
        ]),
      ),
      stateArrayKeyPaths: Object.fromEntries(
        Object.entries(behavior.stateArrayKeyPaths ?? {}).map(([key, value]) => [
          key === name ? normalized : key,
          value,
        ]),
      ),
      transitions: behavior.transitions.map((transition) => ({
        ...transition,
        actions: transition.actions.map((action) => renameActionState(action, name, normalized)),
      })),
    });
    setDraftNames((draft) => {
      const next = { ...draft };
      delete next[name];
      return next;
    });
  };
  const editStateName = (name: string, nextName: string) => {
    if (isStateName(nextName) && !Object.hasOwn(behavior.state ?? {}, nextName))
      renameState(name, nextName);
    else setDraftNames((draft) => ({ ...draft, [name]: nextName }));
  };
  const removeState = (name: string) => {
    if (stateIsReferenced(definition.root, behavior.transitions, name)) return;
    onChange({
      ...behavior,
      state: Object.fromEntries(states.filter(([key]) => key !== name)),
      stateSchema: Object.fromEntries(
        Object.entries(behavior.stateSchema ?? {}).filter(([key]) => key !== name),
      ),
      stateArrayKeyPaths: Object.fromEntries(
        Object.entries(behavior.stateArrayKeyPaths ?? {}).filter(([key]) => key !== name),
      ),
    });
  };
  const addDisabled =
    !isStateName(stateName.trim()) || Object.hasOwn(behavior.state ?? {}, stateName.trim());

  return (
    <>
      <h3 className="inspector-tab-section-title">Internal state</h3>
      <p className="inspector-context-meta">
        States hold private values for this component. The initial value is stored when you add one.
        Use them in class conditions and transitions.
      </p>
      <section className="catalog-behavior-add" aria-label="Add internal state">
        <h4>Add a state</h4>
        <Field label="State name" hint="Use a JavaScript-style name, such as open or activeSlide.">
          <TextInput aria-label="New state name" value={stateName} onChange={setStateName} />
        </Field>
        <Field label="Type">
          <Select
            aria-label="New state type"
            value={stateType}
            options={typeOptions}
            onChange={(value) => setStateType(value as StateType)}
          />
        </Field>
        {stateType === 'boolean' ? (
          <p className="catalog-behavior-initial">
            Initial value when added: <code>false</code>
          </p>
        ) : null}
        {stateType === 'string' ? (
          <Field label="Initial value">
            <TextInput
              aria-label="New state initial value"
              value={initialString}
              onChange={setInitialString}
            />
          </Field>
        ) : null}
        {stateType === 'number' ? (
          <Field label="Initial value">
            <NumberInput
              aria-label="New state initial value"
              value={initialNumber}
              onChange={(value) => setInitialNumber(value ?? 0)}
              step={1}
            />
          </Field>
        ) : null}
        {stateType === 'string-list' ? (
          <p className="catalog-behavior-initial">
            Starts empty. Add example items below; the Repeater can use this state as its source.
          </p>
        ) : null}
        {stateType === 'object-list' ? (
          <p className="catalog-behavior-initial">
            Starts empty with <code>id</code> and <code>label</code> fields. Define the item fields
            after adding the state.
          </p>
        ) : null}
        <Inline gap="sm" align="center">
          <button type="button" onClick={addState} disabled={addDisabled}>
            Add state
          </button>
          {addDisabled && stateName.trim() ? (
            <small>A valid, unused state name is required.</small>
          ) : null}
        </Inline>
      </section>
      {states.length ? (
        <ul className="catalog-behavior-state-list">
          {states.map(([name, value]) => (
            <li key={name} className="catalog-behavior-state">
              <h4>{name}</h4>
              <Field label="State name">
                <TextInput
                  aria-label={`State name ${name}`}
                  value={draftNames[name] ?? name}
                  onChange={(nextName) => editStateName(name, nextName)}
                />
              </Field>
              {typeof value === 'boolean' ? (
                <Toggle
                  aria-label={`Initial value ${name}`}
                  label={`Initial value: ${value ? 'true' : 'false'}`}
                  value={value}
                  onChange={(next) => updateState(name, next)}
                />
              ) : null}
              {typeof value === 'string' ? (
                <Field label="Initial value">
                  <TextInput
                    aria-label={`Initial value ${name}`}
                    value={value}
                    onChange={(next) => updateState(name, next)}
                  />
                </Field>
              ) : null}
              {typeof value === 'number' ? (
                <Field label="Initial value">
                  <NumberInput
                    aria-label={`Initial value ${name}`}
                    value={value}
                    onChange={(next) => updateState(name, next ?? 0)}
                    step={1}
                  />
                </Field>
              ) : null}
              {Array.isArray(value) && value.every((item) => typeof item === 'string') ? (
                <Field label="Initial list items">
                  <ArrayField<string>
                    value={value}
                    defaultItem=""
                    rowLabel="Text"
                    onChange={(next) => updateState(name, next)}
                  >
                    {(item, index) => (
                      <TextInput
                        aria-label={`Initial item ${index + 1} for ${name}`}
                        value={item}
                        onChange={(next) =>
                          updateState(
                            name,
                            (value as string[]).map((current, itemIndex) =>
                              itemIndex === index ? next : current,
                            ),
                          )
                        }
                      />
                    )}
                  </ArrayField>
                </Field>
              ) : null}
              {isObjectList(value, behavior.stateSchema?.[name]) ? (
                <ObjectListStateEditor
                  name={name}
                  value={value}
                  schema={behavior.stateSchema?.[name]}
                  keyPath={behavior.stateArrayKeyPaths?.[name]}
                  error={itemErrors[name]}
                  onFieldsChange={(fields) => updateObjectFields(name, value, fields)}
                  onKeyPathChange={(keyPath) => updateKeyPath(name, value, keyPath)}
                  onItemsChange={(items) => updateObjectItems(name, items)}
                />
              ) : null}
              <div>
                <span className="catalog-behavior-subtitle">Class condition reference</span>
                <code>{`{state:${name}}`}</code>
              </div>
              <button
                type="button"
                onClick={() => removeState(name)}
                disabled={stateIsReferenced(definition.root, behavior.transitions, name)}
              >
                Remove state
              </button>
              {stateIsReferenced(definition.root, behavior.transitions, name) ? (
                <small className="catalog-behavior-error">
                  Remove this state’s Repeater, class condition, or transition references before
                  deleting it.
                </small>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="inspector-empty">
          No internal state yet. Add one above; its initial value becomes part of the component
          definition.
        </p>
      )}
    </>
  );

  function updateObjectFields(name: string, currentItems: FieldValue[], nextFields: ItemField[]) {
    const currentSchema = behavior.stateSchema?.[name];
    const properties = Object.fromEntries(
      nextFields.map((field) => [field.name, { type: field.type }]),
    );
    const currentKeyPath = behavior.stateArrayKeyPaths?.[name];
    const keyPath =
      currentKeyPath &&
      nextFields.some((field) => field.name === currentKeyPath && field.type === 'string')
        ? currentKeyPath
        : nextFields.find((field) => field.type === 'string')?.name;
    const schema: JsonSchemaObject = {
      type: 'array',
      items: {
        type: 'object',
        properties,
        required: keyPath ? [keyPath] : [],
        additionalProperties: false,
      },
    };
    const nextItems = currentItems.map((item) => {
      const source = asRecord(item);
      return Object.fromEntries(
        nextFields.map((field) => [field.name, source[field.name] ?? defaultForType(field.type)]),
      );
    });
    const normalizedItems = keyPath ? assignUniqueKeys(nextItems, keyPath) : nextItems;
    const stateArrayKeyPaths = { ...(behavior.stateArrayKeyPaths ?? {}) };
    if (keyPath) stateArrayKeyPaths[name] = keyPath;
    else delete stateArrayKeyPaths[name];
    onChange({
      ...behavior,
      state: { ...(behavior.state ?? {}), [name]: normalizedItems },
      stateSchema: { ...(behavior.stateSchema ?? {}), [name]: schema },
      stateArrayKeyPaths,
    });
  }

  function updateKeyPath(name: string, currentItems: FieldValue[], keyPath: string) {
    const stateArrayKeyPaths = { ...(behavior.stateArrayKeyPaths ?? {}) };
    if (!keyPath) delete stateArrayKeyPaths[name];
    else stateArrayKeyPaths[name] = keyPath;
    const nextItems = keyPath
      ? assignUniqueKeys(currentItems.map(asRecord), keyPath)
      : currentItems;
    const currentSchema = behavior.stateSchema?.[name];
    const itemSchema = currentSchema?.items;
    const currentItemSchema = isRecord(itemSchema) ? itemSchema : {};
    const schema: JsonSchemaObject = {
      ...(currentSchema ?? {}),
      items: {
        ...currentItemSchema,
        required: keyPath ? [keyPath] : [],
      },
    };
    onChange({
      ...behavior,
      state: { ...(behavior.state ?? {}), [name]: nextItems },
      stateSchema: { ...(behavior.stateSchema ?? {}), [name]: schema },
      stateArrayKeyPaths,
    });
    setItemErrors((current) => ({ ...current, [name]: '' }));
  }

  function updateObjectItems(name: string, items: ItemRecord[]) {
    const keyPath = behavior.stateArrayKeyPaths?.[name];
    if (keyPath && !hasUniqueKeys(items, keyPath)) {
      setItemErrors((current) => ({
        ...current,
        [name]: 'Each item needs a unique, non-empty key.',
      }));
      return;
    }
    updateState(name, items);
    setItemErrors((current) => ({ ...current, [name]: '' }));
  }
}

function renameActionState(
  action: BehaviorAction,
  oldName: string,
  newName: string,
): BehaviorAction {
  if (action.kind === 'emit')
    return {
      ...action,
      args: action.args.map((value) => renameBehaviorValue(value, oldName, newName)),
    };
  if (action.kind === 'increment')
    return action.name === oldName ? { ...action, name: newName } : action;
  if (action.kind === 'move-array-item')
    return action.name === oldName ? { ...action, name: newName } : action;
  if (action.kind === 'append-array-item' || action.kind === 'remove-array-item')
    return action.name === oldName ? { ...action, name: newName } : action;
  return {
    ...action,
    name: action.name === oldName ? newName : action.name,
    value: renameBehaviorValue(action.value, oldName, newName),
  };
}

function renameBehaviorValue(
  value: BehaviorValue,
  oldName: string,
  newName: string,
): BehaviorValue {
  if (value.kind === 'state' || value.kind === 'state-after-transition')
    return value.name === oldName ? { ...value, name: newName } : value;
  if (value.kind === 'operation')
    return {
      ...value,
      values: value.values.map((item) => renameBehaviorValue(item, oldName, newName)),
    };
  return value;
}

function actionUsesState(action: BehaviorAction, name: string) {
  if (
    action.kind === 'move-array-item' ||
    action.kind === 'append-array-item' ||
    action.kind === 'remove-array-item'
  )
    return action.name === name;
  if (action.kind === 'increment' || action.kind === 'set-state')
    return (
      action.name === name || (action.kind === 'set-state' && valueUsesState(action.value, name))
    );
  if (action.kind === 'emit') return action.args.some((value) => valueUsesState(value, name));
  return false;
}

function stateIsReferenced(
  root: Node,
  transitions: readonly ComponentBehavior['transitions'][number][],
  name: string,
) {
  const visit = (node: Node): boolean => {
    const classReference =
      node.classes?.some((item) => conditionUsesState(item.condition, name)) ?? false;
    const source =
      node.config?.composition?.kind === 'repeater' ? node.config.composition.source : undefined;
    const repeaterReference = source?.kind === 'state' && source.name === name;
    const filterReference =
      node.config?.composition?.kind === 'repeater' &&
      node.config.composition.filter?.queryState === name;
    return (
      classReference ||
      repeaterReference ||
      filterReference ||
      (node.dom.children ?? []).some(visit)
    );
  };
  return (
    visit(root) ||
    transitions.some((transition) =>
      transition.actions.some((action) => actionUsesState(action, name)),
    )
  );
}

function conditionUsesState(condition: NodeClassDefinition['condition'], name: string): boolean {
  if (!condition || typeof condition !== 'object') return false;
  if ('kind' in condition && condition.kind === 'rule')
    return condition.conditions.some((child) => conditionUsesState(child, name));
  if ('kind' in condition && condition.kind === 'condition')
    return [condition.left, condition.right].some(
      (operand) => operand?.kind === 'reference' && operand.reference === `{state:${name}}`,
    );
  return false;
}

function valueUsesState(value: BehaviorValue, name: string): boolean {
  if (value.kind === 'state' || value.kind === 'state-after-transition') return value.name === name;
  return value.kind === 'operation' && value.values.some((item) => valueUsesState(item, name));
}
