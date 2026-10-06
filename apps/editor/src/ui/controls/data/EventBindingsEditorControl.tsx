import {
  eventDataMappings,
  eventDataSchema,
  type EventBinding,
  type EventDataSource,
  type EventDefinition,
  type FieldDefinition,
  type FieldValue,
  type JsonSchema,
  type SchemaCatalog,
} from '@facadeur/core';
import { useEffect, useState } from 'react';
import {
  eventPayloadSourceLabel,
  NATIVE_EVENT_NAMES,
  type EventPayloadSource,
} from '../../../domain/events.js';
import { Field, Select, Stack, TextInput, type SelectOption } from '../../form/index.js';
import { fieldPathOptions } from './field-paths.js';
import '../../form/form.css';

const nativeSources: EventDataSource[] = [
  { kind: 'native', path: 'currentTarget.value' },
  { kind: 'native', path: 'currentTarget.checked' },
  { kind: 'native', path: 'currentTarget.valueAsNumber' },
];

export function EventBindingsEditorControl({
  bindings,
  events,
  fields = [],
  schemaCatalog,
  onChangeBindings,
  validateBindings,
  allowIncomplete = false,
  defaultNativeEvent = 'change',
  embedded = false,
  onInvalid,
}: {
  bindings: EventBinding[];
  events: EventDefinition[];
  fields?: FieldDefinition[];
  schemaCatalog?: SchemaCatalog;
  onChangeBindings: (bindings: EventBinding[]) => void;
  validateBindings?: (bindings: EventBinding[]) => string | null;
  allowIncomplete?: boolean;
  defaultNativeEvent?: string;
  embedded?: boolean;
  onInvalid?: (message: string) => void;
}) {
  const [draftBindings, setDraftBindings] = useState<EventBinding[] | null>(null);
  useEffect(() => setDraftBindings(null), [bindings]);
  const workingBindings = draftBindings ?? bindings;

  function applyBindings(next: EventBinding[]) {
    const error = validateBindings?.(next) ?? null;
    if (error && !allowIncomplete) {
      setDraftBindings(next);
      onInvalid?.(error);
      return;
    }
    setDraftBindings(null);
    onChangeBindings(next);
  }

  return (
    <Stack gap={12}>
      {events.length === 0 ? (
        <p className="meta">Define a component event before binding it to a native event.</p>
      ) : null}
      {workingBindings.map((binding, index) => (
        <EventBindingRow
          key={`${binding.event}-${binding.name}-${index}`}
          binding={binding}
          index={index}
          bindings={workingBindings}
          events={events}
          fields={fields}
          schemaCatalog={schemaCatalog}
          onChangeBindings={applyBindings}
          onInvalid={onInvalid}
          embedded={embedded}
        />
      ))}
      {!embedded ? (
        <button
          type="button"
          className="text-button"
          name="add-event-binding"
          disabled={events.length === 0}
          onClick={() => {
            const event = events[0];
            if (event) {
              const binding: EventBinding = { event: event.name, name: defaultNativeEvent };
              applyBindings([
                ...workingBindings,
                withDefaultMappings(event, binding, schemaCatalog),
              ]);
            }
          }}
        >
          Add event binding
        </button>
      ) : null}
      {draftBindings ? (
        <p className="meta" role="status">
          Finish the required data mappings in this draft to save the binding.
        </p>
      ) : null}
    </Stack>
  );
}

function EventBindingRow({
  binding,
  index,
  bindings,
  events,
  fields,
  schemaCatalog,
  onChangeBindings,
  onInvalid,
  embedded,
}: {
  binding: EventBinding;
  index: number;
  bindings: EventBinding[];
  events: EventDefinition[];
  fields: FieldDefinition[];
  schemaCatalog?: SchemaCatalog;
  onChangeBindings: (bindings: EventBinding[]) => void;
  onInvalid?: (message: string) => void;
  embedded: boolean;
}) {
  const definition = events.find((event) => event.name === binding.event);
  const schema = definition ? eventDataSchema(definition, schemaCatalog) : undefined;
  const mappings = definition ? (eventDataMappings(definition, binding) ?? []) : [];

  function commit(next: EventBinding | null) {
    const nextBindings = [...bindings];
    if (next === null) nextBindings.splice(index, 1);
    else nextBindings[index] = next;
    onChangeBindings(nextBindings);
  }

  function changeEvent(eventName: string) {
    const nextDefinition = events.find((event) => event.name === eventName);
    if (!nextDefinition) return;
    const withoutLegacy = { ...binding } as EventBinding & { payload?: unknown };
    delete withoutLegacy.payload;
    commit(
      withDefaultMappings(nextDefinition, { ...withoutLegacy, event: eventName }, schemaCatalog),
    );
  }

  function updateMapping(path: string, source: EventDataSource) {
    const next = mappings.filter((mapping) => mapping.path !== path);
    next.push({ path, source });
    const { payload: _legacyPayload, ...canonical } = binding as EventBinding & {
      payload?: unknown;
    };
    commit({ ...canonical, data: next });
  }

  const contextOptions = fieldPathOptions(fields).map(({ value, label }) => ({
    value: `context:${value}`,
    label,
  }));

  return (
    <Stack gap={8} className="binding-row">
      {!embedded ? (
        <Field label="Event">
          <Select
            name={`event-binding-event-${index}`}
            value={binding.event}
            options={events.map((event) => ({ value: event.name, label: event.name }))}
            onCommit={changeEvent}
          />
        </Field>
      ) : null}
      <Field label="Native event">
        <Select
          name={`event-binding-name-${index}`}
          value={binding.name}
          options={nativeEventOptions(binding.name)}
          onCommit={(name) => commit({ ...binding, name })}
        />
      </Field>
      {schema ? (
        mappingsForSchema(schema).map((target) => {
          const mapping = mappings.find((entry) => entry.path === target.path);
          const selected = mapping ? sourceValue(mapping.source) : 'missing';
          const options: SelectOption[] = [
            ...nativeSources.map((source) => ({
              value: sourceValue(source),
              label:
                source.kind === 'native'
                  ? eventPayloadSourceLabel(nativePathToLegacy(source.path))
                  : '',
            })),
            ...contextOptions,
            { value: 'literal', label: 'Literal value' },
          ];
          if (!options.some((option) => option.value === selected)) {
            options.push({ value: selected, label: 'Missing source', disabled: true });
          }
          const literalValue =
            mapping?.source.kind === 'literal' ? mapping.source.value : undefined;
          return (
            <div
              key={target.path || '$'}
              className="stack"
              data-testid={`event-data-mapping-${index}-${target.path || 'root'}`}
            >
              <Field label={`Data: ${target.path || 'whole value'}`}>
                <Select
                  name={`event-binding-data-source-${index}-${target.path || 'root'}`}
                  value={selected}
                  options={options}
                  onCommit={(value) => {
                    const source = sourceForOption(value, target.schema, fields);
                    if (source) updateMapping(target.path, source);
                    else
                      onInvalid?.(
                        `The selected source is incompatible with event data path "${target.path || 'root'}".`,
                      );
                  }}
                />
              </Field>
              {mapping?.source.kind === 'literal' ? (
                <Field label={`Literal: ${target.path || 'whole value'}`}>
                  <TextInput
                    name={`event-binding-data-literal-${index}-${target.path || 'root'}`}
                    value={JSON.stringify(literalValue)}
                    onCommit={(raw) => {
                      try {
                        const value: unknown = JSON.parse(raw);
                        if (!isFieldValue(value))
                          throw new Error('Literal must be a JSON scalar, array, or object.');
                        updateMapping(target.path, { kind: 'literal', value });
                      } catch (error) {
                        onInvalid?.(
                          error instanceof Error ? error.message : 'Invalid literal value',
                        );
                      }
                    }}
                  />
                </Field>
              ) : null}
            </div>
          );
        })
      ) : definition?.data || definition?.payload ? (
        <p className="meta">
          The event data schema could not be resolved. Check the schema reference.
        </p>
      ) : null}
      <button type="button" className="text-button" onClick={() => commit(null)}>
        {embedded ? 'Remove target' : 'Remove event binding'}
      </button>
    </Stack>
  );
}

export function withDefaultMappings(
  event: EventDefinition,
  binding: EventBinding,
  catalog?: SchemaCatalog,
): EventBinding {
  const existing = eventDataMappings(event, binding) ?? [];
  const schema = eventDataSchema(event, catalog);
  if (!schema) {
    const { payload: _legacyPayload, ...canonical } = binding as EventBinding & {
      payload?: unknown;
    };
    return { ...canonical, data: undefined };
  }
  const targets = mappingsForSchema(schema);
  const mappings = existing.filter((mapping) =>
    targets.some((target) => target.path === mapping.path),
  );
  for (const target of targets) {
    if (!mappings.some((mapping) => mapping.path === target.path)) {
      const source = defaultSource(target.schema);
      if (source) mappings.push({ path: target.path, source });
    }
  }
  const { payload: _legacyPayload, ...canonical } = binding as EventBinding & { payload?: unknown };
  return mappings.length ? { ...canonical, data: mappings } : canonical;
}

function mappingsForSchema(schema: JsonSchema, path = ''): { path: string; schema: JsonSchema }[] {
  const type = Array.isArray(schema.type)
    ? schema.type.find((item) => item !== 'null')
    : schema.type;
  if ((type === 'object' || schema.properties) && Object.keys(schema.properties ?? {}).length) {
    return Object.entries(schema.properties ?? {}).flatMap(([name, property]) =>
      mappingsForSchema(property, path ? `${path}.${name}` : name),
    );
  }
  return [{ path, schema }];
}

function defaultSource(schema: JsonSchema): EventDataSource | undefined {
  const type = Array.isArray(schema.type)
    ? schema.type.find((item) => item !== 'null')
    : schema.type;
  if (type === 'boolean') return { kind: 'native', path: 'currentTarget.checked' };
  if (type === 'number' || type === 'integer')
    return { kind: 'native', path: 'currentTarget.valueAsNumber' };
  if (type === 'string' || type === undefined)
    return { kind: 'native', path: 'currentTarget.value' };
  return undefined;
}

function sourceValue(source: EventDataSource): string {
  if (source.kind === 'native') return `native:${source.path}`;
  if (source.kind === 'context') return `context:${source.path}`;
  return 'literal';
}

function sourceForOption(
  value: string,
  schema: JsonSchema,
  fields: FieldDefinition[],
): EventDataSource | undefined {
  if (value.startsWith('native:')) {
    const path = value.slice('native:'.length);
    const source = nativeSources.find(
      (item): item is Extract<EventDataSource, { kind: 'native' }> =>
        item.kind === 'native' && item.path === path,
    );
    return source && nativeCompatible(source, schema) ? source : undefined;
  }
  if (value.startsWith('context:')) {
    const path = value.slice('context:'.length);
    return fieldPathOptions(fields).some((option) => option.value === path)
      ? { kind: 'context', path }
      : undefined;
  }
  if (value === 'literal') return { kind: 'literal', value: initialLiteral(schema) };
  return undefined;
}

function initialLiteral(schema: JsonSchema): FieldValue {
  const type = Array.isArray(schema.type)
    ? schema.type.find((item) => item !== 'null')
    : schema.type;
  if (type === 'boolean') return false;
  if (type === 'number' || type === 'integer') return 0;
  if (type === 'array') return [];
  if (type === 'object') return {};
  return '';
}

function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFieldValue);
  return typeof value === 'object' && value !== null && Object.values(value).every(isFieldValue);
}

function nativePathToLegacy(path: string): EventPayloadSource {
  if (path === 'currentTarget.checked') return 'checked';
  if (path === 'currentTarget.valueAsNumber') return 'valueAsNumber';
  return 'value';
}

function nativeEventOptions(current: string): { value: string; label: string }[] {
  const names = new Set<string>(NATIVE_EVENT_NAMES);
  if (current.trim()) names.add(current);
  return [...names].map((name) => ({ value: name, label: name }));
}

function nativeCompatible(
  source: Extract<EventDataSource, { kind: 'native' }>,
  schema: JsonSchema,
) {
  const type = Array.isArray(schema.type)
    ? schema.type.find((item) => item !== 'null')
    : schema.type;
  if (source.path === 'currentTarget.checked') return type === 'boolean';
  if (source.path === 'currentTarget.valueAsNumber') return type === 'number' || type === 'integer';
  return type === 'string' || type === undefined;
}
