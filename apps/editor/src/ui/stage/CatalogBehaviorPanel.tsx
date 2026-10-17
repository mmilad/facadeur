'use client';

import { useState } from 'react';
import type {
  BehaviorAction,
  BehaviorValue,
  ComponentBehavior,
  FieldValue,
  Node,
  NodeClassDefinition,
  NodeDefinition,
} from '@facadeur/domain';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import { previewDomEventOptions } from '../../domain/viewport/dom-events';
import { Field } from '../components/feedback';
import { Inline, Stack } from '../components/layout';
import { ArrayField, NumberInput, Select, TextInput, Toggle } from '../controls/form-binding';
import './catalog-behavior-panel.css';

type StateType = 'boolean' | 'string' | 'number' | 'string-list';
type StateEntry = [string, FieldValue | null];
type Transition = ComponentBehavior['transitions'][number];
const typeOptions = [
  { value: 'boolean', label: 'Boolean' },
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'string-list', label: 'List of text items' },
];
const valueKindOptions = [
  { value: 'literal', label: 'Literal' },
  { value: 'state', label: 'State' },
  { value: 'state-after-transition', label: 'State after transition' },
  { value: 'prop', label: 'Component prop' },
  { value: 'event', label: 'Event value' },
  { value: 'operation', label: 'Operation' },
];
const operationOptions = [
  { value: 'not', label: 'Not' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'equals', label: 'Equals' },
];
const actionKindOptions = [
  { value: 'set-state', label: 'Set state' },
  { value: 'increment', label: 'Increment state' },
  { value: 'move-array-item', label: 'Move list item' },
  { value: 'emit', label: 'Emit callback' },
];
const eventOptions = previewDomEventOptions.map(([value, label]) => ({ value, label }));

export function CatalogBehaviorPanel({
  definition,
  onEvent,
}: {
  definition: NodeDefinition | null;
  onEvent: (event: EditorEvent) => void;
}) {
  const [stateName, setStateName] = useState('open');
  const [stateType, setStateType] = useState<StateType>('boolean');
  const [initialString, setInitialString] = useState('');
  const [initialNumber, setInitialNumber] = useState(0);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [transitionNode, setTransitionNode] = useState('');
  const [transitionEvent, setTransitionEvent] = useState('click');
  if (!definition || definition.kind !== 'component') return null;
  const behavior = definition.behavior ?? { state: {}, transitions: [] };
  const states = Object.entries(behavior.state ?? {});
  const nodes = listNodes(definition.root);
  const repeaters = listRepeaters(definition.root);
  const nodeOptions = nodes.map((node) => ({
    value: node.uuid,
    label: `${node.label} (${node.tagName})`,
  }));
  const dispatch = (next: ComponentBehavior) =>
    onEvent({
      type: EditorEventType.DefinitionBehaviorSet,
      data: { behavior: next },
    });
  const setState = (state: Record<string, FieldValue | null>) => dispatch({ ...behavior, state });
  const setTransitions = (transitions: readonly Transition[]) =>
    dispatch({ ...behavior, transitions });
  const addState = () => {
    const name = stateName.trim();
    if (!isStateName(name) || Object.hasOwn(behavior.state ?? {}, name)) return;
    const initial: FieldValue =
      stateType === 'boolean'
        ? false
        : stateType === 'number'
          ? initialNumber
          : stateType === 'string-list'
            ? []
            : initialString;
    dispatch({
      ...behavior,
      state: { ...(behavior.state ?? {}), [name]: initial },
      ...(stateType === 'string-list'
        ? {
            stateSchema: {
              ...(behavior.stateSchema ?? {}),
              [name]: { type: 'array', items: { type: 'string' } },
            },
          }
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
    dispatch({
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
    dispatch({
      ...behavior,
      state: Object.fromEntries(states.filter(([key]) => key !== name)),
      stateSchema: Object.fromEntries(
        Object.entries(behavior.stateSchema ?? {}).filter(([key]) => key !== name),
      ),
    });
  };
  const addTransition = () => {
    const nodeUuid = transitionNode || nodes[0]?.uuid;
    const event = transitionEvent.trim();
    if (!nodeUuid || !event) return;
    setTransitions([...behavior.transitions, { nodeUuid, event, actions: [] }]);
    setTransitionNode(nodeUuid);
    setTransitionEvent('click');
  };
  const updateTransition = (index: number, transition: Transition) =>
    setTransitions(
      behavior.transitions.map((item, itemIndex) => (itemIndex === index ? transition : item)),
    );
  const removeTransition = (index: number) =>
    setTransitions(behavior.transitions.filter((_, itemIndex) => itemIndex !== index));
  const addDisabled =
    !isStateName(stateName.trim()) || Object.hasOwn(behavior.state ?? {}, stateName.trim());
  const transitionDisabled = !nodes.length || !transitionEvent.trim();

  return (
    <section
      className="inspector-tab-section"
      aria-label="Component behavior"
      data-testid="catalog-behavior-panel"
    >
      <h3 className="inspector-tab-section-title">Internal state</h3>
      <p className="inspector-context-meta">
        States hold private values for this component. The initial value is stored when you add one.
        Use them in class conditions and transitions.
      </p>
      <Stack gap="md">
        <section className="catalog-behavior-add" aria-label="Add internal state">
          <h4>Add a state</h4>
          <Field
            label="State name"
            hint="Use a JavaScript-style name, such as open or activeSlide."
          >
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

        <section className="catalog-behavior-add" aria-label="Add transition">
          <h4>Transitions</h4>
          <p className="catalog-behavior-initial">
            Connect an element event to data-only state changes or a component callback.
          </p>
          {nodes.length ? (
            <Field label="Element">
              <Select
                aria-label="Transition element"
                value={transitionNode || nodes[0]?.uuid || ''}
                options={nodeOptions}
                onChange={setTransitionNode}
              />
            </Field>
          ) : (
            <p className="inspector-empty">
              Add an element to the component before creating a transition.
            </p>
          )}
          <Field label="Event" hint="Only DOM events supported by the preview can be bound.">
            <Select
              aria-label="Transition event name"
              value={transitionEvent}
              options={eventOptions}
              onChange={setTransitionEvent}
            />
          </Field>
          <button type="button" onClick={addTransition} disabled={transitionDisabled}>
            Add transition
          </button>
        </section>
        {behavior.transitions.length ? (
          <ul className="catalog-behavior-transition-list">
            {behavior.transitions.map((transition, index) => (
              <li
                className="catalog-behavior-transition"
                key={`${transition.nodeUuid}-${transition.event}-${index}`}
              >
                <h4>
                  When {nodeLabel(nodes, transition.nodeUuid)} emits {transition.event}
                </h4>
                <Field label="Element">
                  <Select
                    aria-label={`Element for transition ${index + 1}`}
                    value={transition.nodeUuid}
                    options={nodeOptions}
                    onChange={(nodeUuid) => updateTransition(index, { ...transition, nodeUuid })}
                  />
                </Field>
                <Field label="Event">
                  <Select
                    aria-label={`Event name for transition ${index + 1}`}
                    value={transition.event}
                    options={eventOptions}
                    onChange={(event) => updateTransition(index, { ...transition, event })}
                  />
                </Field>
                {transition.actions.map((action, actionIndex) => (
                  <ActionEditor
                    key={actionIndex}
                    action={action}
                    states={states}
                    repeaters={repeaters}
                    transitionNodeUuid={transition.nodeUuid}
                    onChange={(next) =>
                      updateTransition(index, {
                        ...transition,
                        actions: transition.actions.map((item, i) =>
                          i === actionIndex ? next : item,
                        ),
                      })
                    }
                    onRemove={() =>
                      updateTransition(index, {
                        ...transition,
                        actions: transition.actions.filter((_, i) => i !== actionIndex),
                      })
                    }
                  />
                ))}
                <Inline gap="sm" align="center">
                  <button
                    type="button"
                    onClick={() =>
                      updateTransition(index, {
                        ...transition,
                        actions: [
                          ...transition.actions,
                          {
                            kind: 'set-state',
                            name: states[0]?.[0] ?? '',
                            value: { kind: 'literal', value: null },
                          },
                        ],
                      })
                    }
                    disabled={!states.length}
                  >
                    Add state action
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateTransition(index, {
                        ...transition,
                        actions: [
                          ...transition.actions,
                          {
                            kind: 'increment',
                            name:
                              states.find(([, value]) => typeof value === 'number')?.[0] ??
                              states[0]?.[0] ??
                              '',
                            amount: 1,
                          },
                        ],
                      })
                    }
                    disabled={!states.length}
                  >
                    Add increment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const list = states.find(([, value]) => Array.isArray(value))?.[0] ?? '';
                      const repeater = repeaters.find(
                        (item) =>
                          item.stateName === list && item.nodeUuids.includes(transition.nodeUuid),
                      );
                      if (!repeater) return;
                      updateTransition(index, {
                        ...transition,
                        actions: [
                          ...transition.actions,
                          {
                            kind: 'move-array-item',
                            name: list,
                            repeaterUuid: repeater.uuid,
                            direction: 'up',
                          },
                        ],
                      });
                    }}
                    disabled={
                      !repeaters.some(
                        (item) =>
                          item.nodeUuids.includes(transition.nodeUuid) &&
                          states.some(
                            ([name, value]) => Array.isArray(value) && item.stateName === name,
                          ),
                      )
                    }
                  >
                    Add move item
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateTransition(index, {
                        ...transition,
                        actions: [...transition.actions, { kind: 'emit', name: '', args: [] }],
                      })
                    }
                  >
                    Add callback
                  </button>
                  <button type="button" onClick={() => removeTransition(index)}>
                    Remove transition
                  </button>
                </Inline>
              </li>
            ))}
          </ul>
        ) : (
          <p className="inspector-empty">
            No transitions yet. Add one to describe what an element event should do.
          </p>
        )}
      </Stack>
    </section>
  );
}

function ActionEditor({
  action,
  states,
  repeaters,
  transitionNodeUuid,
  onChange,
  onRemove,
}: {
  action: BehaviorAction;
  states: StateEntry[];
  repeaters: { uuid: string; label: string; stateName?: string; nodeUuids: string[] }[];
  transitionNodeUuid: string;
  onChange: (action: BehaviorAction) => void;
  onRemove: () => void;
}) {
  const stateOptions = states.map(([name]) => ({ value: name, label: name }));
  const arrayStateOptions = states
    .filter(([, value]) => Array.isArray(value))
    .map(([name]) => ({ value: name, label: name }));
  const changeKind = (kind: string) => {
    if (kind === 'set-state')
      onChange({ kind, name: states[0]?.[0] ?? '', value: { kind: 'literal', value: null } });
    else if (kind === 'increment')
      onChange({
        kind,
        name: states.find(([, value]) => typeof value === 'number')?.[0] ?? states[0]?.[0] ?? '',
        amount: 1,
      });
    else if (kind === 'move-array-item') {
      const list = arrayStateOptions[0]?.value ?? '';
      const repeater = repeaters.find(
        (item) => item.stateName === list && item.nodeUuids.includes(transitionNodeUuid),
      );
      onChange({
        kind,
        name: list,
        repeaterUuid: repeater?.uuid ?? '',
        direction: 'up',
      });
    } else onChange({ kind: 'emit', name: '', args: [] });
  };
  return (
    <section className="catalog-behavior-action" aria-label="Transition action">
      <Field label="Action">
        <Select
          aria-label="Action type"
          value={action.kind}
          options={actionKindOptions}
          onChange={changeKind}
        />
      </Field>
      {action.kind === 'set-state' ? (
        <>
          <Field label="State">
            <Select
              aria-label="State to set"
              value={action.name}
              options={stateOptions}
              onChange={(name) => onChange({ ...action, name })}
            />
          </Field>
          <BehaviorValueEditor
            value={action.value}
            states={states}
            onChange={(value) => onChange({ ...action, value })}
          />
        </>
      ) : null}
      {action.kind === 'increment' ? (
        <>
          <Field label="State">
            <Select
              aria-label="State to increment"
              value={action.name}
              options={stateOptions}
              onChange={(name) => onChange({ ...action, name })}
            />
          </Field>
          <Field label="Amount">
            <NumberInput
              aria-label="Increment amount"
              value={action.amount ?? 1}
              onChange={(amount) => onChange({ ...action, amount: amount ?? 0 })}
              step={1}
            />
          </Field>
        </>
      ) : null}
      {action.kind === 'emit' ? (
        <>
          <Field
            label="Callback name"
            hint="The component schema must define the matching on<Name> callback prop."
          >
            <TextInput
              aria-label="Callback name"
              value={action.name}
              onChange={(name) => onChange({ ...action, name })}
            />
          </Field>
          {action.args.map((value, index) => (
            <div className="catalog-behavior-argument" key={index}>
              <BehaviorValueEditor
                value={value}
                states={states}
                onChange={(next) =>
                  onChange({
                    ...action,
                    args: action.args.map((item, i) => (i === index ? next : item)),
                  })
                }
              />
              <button
                type="button"
                onClick={() =>
                  onChange({ ...action, args: action.args.filter((_, i) => i !== index) })
                }
              >
                Remove argument
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange({ ...action, args: [...action.args, { kind: 'literal', value: null }] })
            }
          >
            Add callback argument
          </button>
        </>
      ) : null}
      {action.kind === 'move-array-item' ? (
        <>
          <Field label="Array state">
            <Select
              aria-label="Array state to reorder"
              value={action.name}
              options={arrayStateOptions}
              onChange={(name) => {
                const repeater = repeaters.find((item) => item.stateName === name);
                onChange({ ...action, name, repeaterUuid: repeater?.uuid ?? '' });
              }}
            />
          </Field>
          <Field label="Repeater">
            <Select
              aria-label="Repeater row index source"
              value={action.repeaterUuid}
              options={repeaters
                .filter(
                  (repeater) =>
                    repeater.stateName === action.name &&
                    repeater.nodeUuids.includes(transitionNodeUuid),
                )
                .map(({ uuid, label }) => ({ value: uuid, label }))}
              onChange={(repeaterUuid) => onChange({ ...action, repeaterUuid })}
            />
          </Field>
          <Field label="Direction">
            <Select
              aria-label="List move direction"
              value={action.direction}
              options={[
                { value: 'up', label: 'Up' },
                { value: 'down', label: 'Down' },
              ]}
              onChange={(direction) =>
                onChange({ ...action, direction: direction as 'up' | 'down' })
              }
            />
          </Field>
        </>
      ) : null}
      <button type="button" onClick={onRemove}>
        Remove action
      </button>
    </section>
  );
}

function BehaviorValueEditor({
  value,
  states,
  onChange,
  depth = 0,
}: {
  value: BehaviorValue;
  states: StateEntry[];
  onChange: (value: BehaviorValue) => void;
  depth?: number;
}) {
  const operation = value.kind === 'operation' ? value : null;
  const stateOptions = states.map(([name]) => ({ value: name, label: name }));
  const updateKind = (kind: string) => {
    if (kind === 'literal') onChange({ kind, value: null });
    else if (kind === 'state' || kind === 'state-after-transition')
      onChange({ kind, name: states[0]?.[0] ?? '' });
    else if (kind === 'prop' || kind === 'event') onChange({ kind, path: '' });
    else
      onChange({
        kind: 'operation',
        operator: 'toggle',
        values: [{ kind: 'state', name: states[0]?.[0] ?? '' }],
      });
  };
  const setOperator = (operator: 'not' | 'add' | 'subtract' | 'equals' | 'toggle') => {
    if (!operation) return;
    const count = operator === 'not' || operator === 'toggle' ? 1 : 2;
    const values = operation.values.slice(0, count);
    while (values.length < count) values.push({ kind: 'literal', value: null });
    onChange({ ...operation, operator, values });
  };
  const literalValue = value.kind === 'literal' ? value.value : null;
  const literalType = literalValue === null ? 'null' : typeof literalValue;
  return (
    <div className="catalog-behavior-value" data-depth={depth}>
      <Field label="Value type">
        <Select
          aria-label="Behavior value type"
          value={value.kind}
          options={valueKindOptions}
          onChange={updateKind}
        />
      </Field>
      {value.kind === 'literal' ? (
        <>
          <Field label="Literal type">
            <Select
              aria-label="Literal type"
              value={literalType}
              options={[
                { value: 'null', label: 'Null' },
                { value: 'boolean', label: 'Boolean' },
                { value: 'number', label: 'Number' },
                { value: 'string', label: 'Text' },
              ]}
              onChange={(kind) =>
                onChange({
                  kind: 'literal',
                  value:
                    kind === 'boolean'
                      ? false
                      : kind === 'number'
                        ? 0
                        : kind === 'string'
                          ? ''
                          : null,
                })
              }
            />
          </Field>
          {literalType === 'boolean' ? (
            <Toggle
              aria-label="Literal boolean"
              label={`Literal: ${literalValue}`}
              value={literalValue as boolean}
              onChange={(next) => onChange({ kind: 'literal', value: next })}
            />
          ) : null}
          {literalType === 'number' ? (
            <Field label="Literal value">
              <NumberInput
                aria-label="Literal number"
                value={literalValue as number}
                onChange={(next) => onChange({ kind: 'literal', value: next ?? 0 })}
                step={1}
              />
            </Field>
          ) : null}
          {literalType === 'string' ? (
            <Field label="Literal value">
              <TextInput
                aria-label="Literal text"
                value={literalValue as string}
                onChange={(next) => onChange({ kind: 'literal', value: next })}
              />
            </Field>
          ) : null}
        </>
      ) : null}
      {value.kind === 'state' || value.kind === 'state-after-transition' ? (
        <Field label="State">
          <Select
            aria-label="Referenced state"
            value={value.name}
            options={stateOptions}
            onChange={(name) => onChange({ ...value, name })}
          />
        </Field>
      ) : null}
      {value.kind === 'prop' || value.kind === 'event' ? (
        <Field
          label={value.kind === 'prop' ? 'Prop path' : 'Event path'}
          hint="Use dot notation for nested values."
        >
          <TextInput
            aria-label={value.kind === 'prop' ? 'Prop path' : 'Event path'}
            value={value.path}
            onChange={(path) => onChange({ ...value, path })}
          />
        </Field>
      ) : null}
      {operation ? (
        <>
          <Field label="Operation">
            <Select
              aria-label="Operation"
              value={operation.operator}
              options={operationOptions}
              onChange={(next) => setOperator(next as typeof operation.operator)}
            />
          </Field>
          {operation.values.map((item, index) => (
            <BehaviorValueEditor
              key={index}
              value={item}
              states={states}
              depth={depth + 1}
              onChange={(next) =>
                onChange({
                  ...operation,
                  values: operation.values.map((current, i) => (i === index ? next : current)),
                })
              }
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

function listNodes(root: Node) {
  const nodes: { uuid: string; label: string; tagName: string }[] = [];
  const visit = (node: Node, path: string[]) => {
    const label = node.name?.trim() || node.dom.tagName || 'element';
    const nextPath = [...path, label];
    nodes.push({
      uuid: node.uuid,
      label: nextPath.join(' / '),
      tagName: node.dom.tagName || 'element',
    });
    for (const child of node.dom.children ?? []) visit(child, nextPath);
  };
  visit(root, []);
  return nodes;
}

function listRepeaters(root: Node) {
  const repeaters: {
    uuid: string;
    label: string;
    stateName?: string;
    nodeUuids: string[];
  }[] = [];
  const visit = (node: Node, path: string[]) => {
    const label = node.name?.trim() || node.dom.tagName || 'element';
    const nextPath = [...path, label];
    const composition = node.config?.composition;
    if (composition?.kind === 'repeater') {
      repeaters.push({
        uuid: node.uuid,
        label: nextPath.join(' / '),
        nodeUuids: listNodes(node)
          .map((entry) => entry.uuid)
          .filter((uuid) => uuid !== node.uuid),
        ...(composition.source?.kind === 'state' ? { stateName: composition.source.name } : {}),
      });
    }
    for (const child of node.dom.children ?? []) visit(child, nextPath);
  };
  visit(root, []);
  return repeaters;
}

function nodeLabel(nodes: ReturnType<typeof listNodes>, uuid: string) {
  return nodes.find((node) => node.uuid === uuid)?.label ?? uuid;
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
  if (action.kind === 'move-array-item') return action.name === name;
  if (action.kind === 'increment' || action.kind === 'set-state')
    return (
      action.name === name || (action.kind === 'set-state' && valueUsesState(action.value, name))
    );
  if (action.kind === 'emit') return action.args.some((value) => valueUsesState(value, name));
  return false;
}

function stateIsReferenced(root: Node, transitions: readonly Transition[], name: string): boolean {
  const visit = (node: Node): boolean => {
    const classReference =
      node.classes?.some((item) => conditionUsesState(item.condition, name)) ?? false;
    const source =
      node.config?.composition?.kind === 'repeater' ? node.config.composition.source : undefined;
    const repeaterReference = source?.kind === 'state' && source.name === name;
    return classReference || repeaterReference || (node.dom.children ?? []).some(visit);
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
  if ('kind' in condition && condition.kind === 'condition') {
    return [condition.left, condition.right].some(
      (operand) => operand?.kind === 'reference' && operand.reference === `{state:${name}}`,
    );
  }
  return false;
}

function valueUsesState(value: BehaviorValue, name: string): boolean {
  if (value.kind === 'state' || value.kind === 'state-after-transition') return value.name === name;
  return value.kind === 'operation' && value.values.some((item) => valueUsesState(item, name));
}

function isStateName(name: string) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return false;
  return !new Set([
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'null',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ]).has(name);
}
