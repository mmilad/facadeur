import { DocumentError } from '../document/errors.js';
import { makeFlatNode, type FlatDocument } from '../document/flat.js';
import {
  isVariantAxis,
  type EventDefinition,
  type Expose,
  type FieldDefinition,
  type FieldValue,
  type VariantAxis,
  type VariantPreset,
  type StyleBlock,
} from '../document/schema.js';
import { omitVariantAxis, omitVariantValues, parseStyleBlock } from '../styles/style-block.js';
import {
  assertEventDefinition,
  assertExpose,
  assertFieldDefinition,
  assertVariantAxis,
  assertVariantPreset,
  assertValueMatches,
} from '../validation/assertions.js';
import type { Command } from './types.js';

export function defineField(doc: FlatDocument, field: FieldDefinition): void {
  assertFieldDefinition(field);
  const index = doc.fields.findIndex((item) => item.name === field.name);
  if (index === -1) doc.fields.push(field);
  else {
    doc.fields[index] = field;
    cleanFieldValues(doc, field);
  }
}

/** A schema type edit can invalidate values kept in the separate preview store. */
function cleanFieldValues(doc: FlatDocument, field: FieldDefinition): void {
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

export function removeField(doc: FlatDocument, name: string): void {
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

export function defineEvent(doc: FlatDocument, event: EventDefinition): void {
  assertEventDefinition(event);
  const events = doc.events ? [...doc.events] : [];
  const index = events.findIndex((item) => item.name === event.name);
  if (index === -1) events.push(structuredClone(event));
  else events[index] = structuredClone(event);
  doc.events = events;
}

/** Removing a public event also removes native bindings that target it. */
export function removeEvent(doc: FlatDocument, name: string): void {
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

export function setExpose(doc: FlatDocument, expose: Expose | null): void {
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

export function defineVariant(doc: FlatDocument, axis: VariantAxis): void {
  assertVariantAxis(axis);
  const previous = doc.variants.find(
    (item): item is VariantAxis => isVariantAxis(item) && item.name === axis.name,
  );
  const index = previous ? doc.variants.indexOf(previous) : -1;
  if (index === -1) doc.variants.push(axis);
  else doc.variants[index] = axis;
  if (!previous || !doc.styles) return;
  const removed = previous.values.some((value) => !axis.values.includes(value));
  if (!removed) return;
  const pruned = omitVariantValues(doc.styles, axis.name, new Set(axis.values));
  if (pruned) doc.styles = pruned;
  else delete doc.styles;
}

export function removeVariant(doc: FlatDocument, name: string): void {
  const index = doc.variants.findIndex((item) => isVariantAxis(item) && item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-variant', `Variant "${name}" is not defined`);
  }
  doc.variants.splice(index, 1);
  if (!doc.styles) return;
  const pruned = omitVariantAxis(doc.styles, name);
  if (pruned) doc.styles = pruned;
  else delete doc.styles;
}

export function setVariantPreset(doc: FlatDocument, preset: VariantPreset): void {
  assertVariantPreset(preset);
  const next = structuredClone(preset);
  const presets = doc.variantPresets ? [...doc.variantPresets] : [];
  const index = presets.findIndex((item) => item.name === next.name);
  if (index === -1) presets.push(next);
  else presets[index] = next;
  doc.variantPresets = presets;
  if (next.overrides?.styles && doc.styles) {
    const styles = structuredClone(doc.styles);
    removeNamedVariantLayer(styles, next.name);
    doc.styles = Object.keys(styles).length ? styles : undefined;
  }
}

export function setVariantStyleBlock(
  doc: FlatDocument,
  command: Extract<Command, { type: 'setVariantStyleBlock' }>,
): void {
  const presets = doc.variantPresets ? [...doc.variantPresets] : [];
  const index = presets.findIndex((item) => item.name === command.name);
  if (index === -1) {
    throw new DocumentError('unknown-variant', `Variant preset "${command.name}" is not defined`);
  }
  const existing = presets[index];
  if (!existing) {
    throw new DocumentError('unknown-variant', `Variant preset "${command.name}" is not defined`);
  }
  const preset: VariantPreset = structuredClone(existing);
  const overrides = { ...(preset.overrides ?? {}) };
  if (command.style === null) delete overrides.styles;
  else overrides.styles = parseStyleBlock(command.style);
  if (Object.keys(overrides).length) preset.overrides = overrides;
  else delete preset.overrides;
  presets[index] = preset;
  doc.variantPresets = presets;
  if (doc.styles) {
    const styles = structuredClone(doc.styles);
    removeNamedVariantLayer(styles, command.name);
    doc.styles = Object.keys(styles).length ? styles : undefined;
  }
}

function removeNamedVariantLayer(styles: StyleBlock, name: string): void {
  removeNamedVariantLayerFromOwner(styles, name);
  for (const child of Object.values(styles.children ?? {})) {
    removeNamedVariantLayerFromOwner(child, name);
  }
  if (styles.children) {
    for (const [id, child] of Object.entries(styles.children)) {
      if (!Object.keys(child).length) delete styles.children[id];
    }
    if (!Object.keys(styles.children).length) delete styles.children;
  }
}

function removeNamedVariantLayerFromOwner(
  owner: { variants?: NonNullable<StyleBlock['variants']> },
  name: string,
): void {
  const values = owner.variants?.variant;
  if (!values) return;
  delete values[name];
  if (!Object.keys(values).length) delete owner.variants!.variant;
  if (!Object.keys(owner.variants!).length) delete owner.variants;
}

export function removeVariantPreset(doc: FlatDocument, name: string): void {
  const presets = doc.variantPresets ?? [];
  const index = presets.findIndex((item) => item.name === name);
  if (index === -1) {
    throw new DocumentError('unknown-variant', `Variant preset "${name}" is not defined`);
  }
  presets.splice(index, 1);
  if (doc.variantLabels) delete doc.variantLabels[name];
  if (doc.previewData?.variants) delete doc.previewData.variants[name];
  if (presets.length) doc.variantPresets = presets;
  else delete doc.variantPresets;
}
