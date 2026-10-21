'use client';

import { useState } from 'react';
import type {
  BehaviorAction,
  BehaviorValue,
  ComponentBehavior,
  FieldValue,
  Node,
  NodeDefinition,
} from '@facadeur/domain';
import type { EditorEvent } from '../../domain/sidebar/events';
import { EditorEventType } from '../../domain/sidebar/events';
import { previewDomEventOptions } from '../../domain/viewport/dom-events';
import { CatalogBehaviorStates } from './CatalogBehaviorStates';
import { Field } from '../components/feedback';
import { Inline, Stack } from '../components/layout';
import { NumberInput, Select, TextInput, Toggle } from '../controls/form-binding';
import './catalog-behavior-panel.css';

type StateEntry = [string, FieldValue | null];
type Transition = ComponentBehavior['transitions'][number];
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
  { value: 'append-array-item', label: 'Add list item' },
  { value: 'remove-array-item', label: 'Remove current list item' },
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
  const setTransitions = (transitions: readonly Transition[]) =>
    dispatch({ ...behavior, transitions });
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
  const transitionDisabled = !nodes.length || !transitionEvent.trim();

  return (
    <section
      className="inspector-tab-section"
      aria-label="Component behavior"
      data-testid="catalog-behavior-panel"
    >
      <Stack gap="md">
        <CatalogBehaviorStates definition={definition} behavior={behavior} onChange={dispatch} />

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
    else if (
      kind === 'move-array-item' ||
      kind === 'append-array-item' ||
      kind === 'remove-array-item'
    ) {
      const list = arrayStateOptions[0]?.value ?? '';
      const repeater = repeaters.find((item) => item.stateName === list);
      onChange(
        kind === 'move-array-item'
          ? { kind, name: list, repeaterUuid: repeater?.uuid ?? '', direction: 'up' }
          : { kind, name: list, repeaterUuid: repeater?.uuid ?? '' },
      );
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
      {action.kind === 'append-array-item' ||
      action.kind === 'remove-array-item' ||
      action.kind === 'move-array-item' ? (
        <>
          <Field label="Array state">
            <Select
              aria-label="Array state for item action"
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
              aria-label="Repeater item action scope"
              value={action.repeaterUuid}
              options={repeaters
                .filter(
                  (repeater) =>
                    repeater.stateName === action.name &&
                    (action.kind === 'append-array-item' ||
                      repeater.nodeUuids.includes(transitionNodeUuid)),
                )
                .map(({ uuid, label }) => ({ value: uuid, label }))}
              onChange={(repeaterUuid) => onChange({ ...action, repeaterUuid })}
            />
          </Field>
          {action.kind === 'move-array-item' ? (
            <Field label="Direction">
              <Select
                aria-label="List move direction"
                value={action.direction}
                options={[
                  { value: 'up', label: 'Up' },
                  { value: 'down', label: 'Down' },
                  { value: 'before', label: 'Before dropped item' },
                  { value: 'after', label: 'After dropped item' },
                ]}
                onChange={(direction) =>
                  onChange({
                    ...action,
                    direction: direction as 'up' | 'down' | 'before' | 'after',
                  })
                }
              />
            </Field>
          ) : null}
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
