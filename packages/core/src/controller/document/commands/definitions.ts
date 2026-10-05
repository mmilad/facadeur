import { DocumentError } from '../../../document/errors.js';
import { makeFlatNode, type FlatDocument } from '../../../document/flat.js';
import type {
  EventDefinition,
  EventBinding,
  Expose,
  FieldDefinition,
  FieldValue,
} from '../../../schema/document.js';
import {
  assertEventDefinition,
  assertEventBindings,
  assertExpose,
  assertFieldDefinition,
  assertValueMatches,
} from '../../validation/assertions.js';

export function defineField(doc: FlatDocument, field: FieldDefinition) {
  assertFieldDefinition(field);
  const index = doc.fields.findIndex((item) => item.name === field.name);
  if (index === -1) doc.fields.push(field);
  else {
    doc.fields[index] = field;
    cleanFieldValues(doc, field);
  }
}

/** A schema type edit can invalidate values kept in the separate preview store. */
function cleanFieldValues(doc: FlatDocument, field: FieldDefinition) {
  const clean = (values: Record<string, FieldValue> | undefined) => {
    const value = values?.[field.name];
    if (value === undefined) return;
    try {
      assertValueMatches(field, value);
    } catch {
      delete values![field.name];
    }
  };
  clean(doc.previewData?.fields);
  if (doc.previewData?.fields && Object.keys(doc.previewData.fields).length === 0) {
    delete doc.previewData.fields;
  }
  for (const [name, values] of Object.entries(doc.previewData?.variants ?? {})) {
    clean(values);
    if (Object.keys(values).length === 0) delete doc.previewData!.variants![name];
  }
  if (doc.previewData?.variants && Object.keys(doc.previewData.variants).length === 0) {
    delete doc.previewData.variants;
  }
  if (doc.previewData && !doc.previewData.fields && !doc.previewData.variants) {
    delete doc.previewData;
  }
  for (const preset of doc.variantPresets ?? []) clean(preset.overrides?.fields);
}

export function removeField(doc: FlatDocument, name: string) {
  const index = doc.fields.findIndex((item) => item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-field', `Field "${name}" is not defined`);
  }
  doc.fields.splice(index, 1);
  if (doc.previewData?.fields) delete doc.previewData.fields[name];
  for (const values of Object.values(doc.previewData?.variants ?? {})) delete values[name];
  for (const node of Object.values(doc.nodes)) {
    if (node.type === 'instance' || !node.bindings?.some((binding) => binding.field === name)) {
      continue;
    }
    const bindings = node.bindings.filter((binding) => binding.field !== name);
    if (bindings.length) node.bindings = bindings;
    else delete node.bindings;
    doc.nodes[node.id] = makeFlatNode(node);
  }
}

export function defineEvent(
  doc: FlatDocument,
  event: EventDefinition,
  options: { previousName?: string; bindings?: Record<string, EventBinding[]> } = {},
) {
  assertEventDefinition(event);
  const events = doc.events ? [...doc.events] : [];
  const previousIndex = options.previousName
    ? events.findIndex((item) => item.name === options.previousName)
    : -1;
  if (options.previousName && previousIndex === -1) {
    throw new DocumentError('unknown-event', `Event "${options.previousName}" is not defined`);
  }
  if (
    options.previousName &&
    options.previousName !== event.name &&
    events.some((item) => item.name === event.name)
  ) {
    throw new DocumentError('schema', `Event "${event.name}" is already defined`);
  }
  const index =
    previousIndex !== -1 ? previousIndex : events.findIndex((item) => item.name === event.name);
  if (index === -1) events.push(structuredClone(event));
  else events[index] = structuredClone(event);
  doc.events = events;
  if (options.previousName && options.previousName !== event.name) {
    for (const node of Object.values(doc.nodes)) {
      if (
        node.type === 'instance' ||
        !node.eventBindings?.some((binding) => binding.event === options.previousName)
      ) {
        continue;
      }
      const bindings = node.eventBindings.map((binding) => ({
        ...structuredClone(binding),
        ...(binding.event === options.previousName ? { event: event.name } : {}),
      }));
      node.eventBindings = bindings;
    }
  }
  for (const [nodeId, bindings] of Object.entries(options.bindings ?? {})) {
    const node = doc.nodes[nodeId];
    if (!node || node.type === 'instance' || node.type === 'repeater' || node.type === 'switch') {
      throw new DocumentError(
        'unknown-node',
        `Event binding target "${nodeId}" is not a native node`,
      );
    }
    assertEventBindings(bindings);
    for (const binding of bindings) {
      if (!events.some((entry) => entry.name === binding.event)) {
        throw new DocumentError(
          'unknown-event',
          `Native node "${nodeId}" binds unknown event "${binding.event}"`,
        );
      }
    }
    if (bindings.length) node.eventBindings = bindings.map((binding) => structuredClone(binding));
    else delete node.eventBindings;
  }
}

/** Removing a public event also removes native bindings that target it. */
export function removeEvent(doc: FlatDocument, name: string) {
  const events = doc.events ?? [];
  const index = events.findIndex((item) => item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-event', `Event "${name}" is not defined`);
  }
  events.splice(index, 1);
  if (events.length) doc.events = events;
  else delete doc.events;
  for (const node of Object.values(doc.nodes)) {
    if (
      node.type === 'instance' ||
      !node.eventBindings?.some((binding) => binding.event === name)
    ) {
      continue;
    }
    const bindings = node.eventBindings.filter((binding) => binding.event !== name);
    if (bindings.length) node.eventBindings = bindings;
    else delete node.eventBindings;
    doc.nodes[node.id] = makeFlatNode(node);
  }
}

export function setExpose(doc: FlatDocument, expose: Expose | null) {
  if (expose === null) {
    delete doc.expose;
    return;
  }
  assertExpose(expose);
  doc.expose = {
    ...(expose.fields ? { fields: { ...expose.fields } } : {}),
    ...(expose.events ? { events: { ...expose.events } } : {}),
  };
}
