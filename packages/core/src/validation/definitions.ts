import { DocumentError } from '../document/errors.js';
import { type FlatDocument, type FlatNode } from '../document/flat.js';
import {
  type Binding,
  type FieldDefinition,
  type FieldValue,
  type VariantPreset,
} from '../document/schema.js';
import {
  assertEventDefinition,
  assertExpose,
  assertFieldDefinition,
  assertValueMatches,
  assertVariantAxis,
  assertVariantPreset,
} from './assertions.js';

/** Sections and pages do not own component properties. Atoms and components do. */
export function assertDefinitionKind(doc: FlatDocument): void {
  if (doc.kind !== 'section' && doc.kind !== 'page') return;
  if (doc.fields.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define fields`);
  }
  if (doc.variants.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define variants`);
  }
  if (doc.variantPresets?.length) {
    throw new DocumentError('schema', `${doc.kind} documents cannot define variants`);
  }
}

export function validateDefinitions(doc: FlatDocument): void {
  assertDefinitionKind(doc);
  const names = new Set<string>();
  for (const field of doc.fields) {
    assertFieldDefinition(field);
    if (names.has(field.name)) {
      throw new DocumentError('schema', `Duplicate field "${field.name}"`);
    }
    names.add(field.name);
  }
  const events = doc.events ?? [];
  const eventNames = new Set<string>();
  for (const event of events) {
    assertEventDefinition(event);
    if (eventNames.has(event.name)) {
      throw new DocumentError('schema', `Duplicate event "${event.name}"`);
    }
    eventNames.add(event.name);
  }
  if (doc.expose) assertExpose(doc.expose);
  const variantNames = new Set<string>();
  for (const axis of doc.variants) {
    assertVariantAxis(axis);
    if (variantNames.has(axis.name)) {
      throw new DocumentError('schema', `Duplicate variant "${axis.name}"`);
    }
    variantNames.add(axis.name);
  }
  for (const variant of doc.variantPresets ?? []) {
    assertVariantPreset(variant);
    assertVariantTargets(doc, variant);
    assertVariantFieldTargets(doc, variant);
    if (variantNames.has(variant.name)) {
      throw new DocumentError('schema', `Duplicate variant "${variant.name}"`);
    }
    variantNames.add(variant.name);
    for (const [name, value] of Object.entries(variant.overrides?.fields ?? {})) {
      const field = doc.fields.find((entry) => entry.name === name);
      if (!field) {
        throw new DocumentError(
          'unknown-field',
          `Variant "${variant.name}" overrides unknown field "${name}"`,
        );
      }
      assertValueMatches(field, value);
    }
  }
  const presetNames = new Set((doc.variantPresets ?? []).map((preset) => preset.name));
  for (const [name, label] of Object.entries(doc.variantLabels ?? {})) {
    if (name !== 'default' && !presetNames.has(name)) {
      throw new DocumentError(
        'unknown-variant',
        `Display name refers to unknown variant "${name}"`,
      );
    }
    if (typeof label !== 'string' || !label.trim()) {
      throw new DocumentError('schema', 'Variant display names cannot be empty');
    }
  }
  const assertPreviewValues = (values: Record<string, FieldValue>) => {
    for (const [name, value] of Object.entries(values)) {
      const field = doc.fields.find((candidate) => candidate.name === name);
      if (!field)
        throw new DocumentError('unknown-field', `Preview refers to unknown field "${name}"`);
      assertValueMatches(field, value);
    }
  };
  if (doc.previewData?.fields) assertPreviewValues(doc.previewData.fields);
  for (const [name, values] of Object.entries(doc.previewData?.variants ?? {})) {
    if (!presetNames.has(name)) {
      throw new DocumentError('unknown-variant', `Preview refers to unknown variant "${name}"`);
    }
    assertPreviewValues(values);
  }
  for (const node of Object.values(doc.nodes)) {
    if (node.type === 'instance') continue;
    for (const binding of node.bindings ?? []) {
      if (!names.has(binding.field)) {
        throw new DocumentError(
          'unknown-field',
          `Node "${node.id}" binds unknown field "${binding.field}"`,
        );
      }
      const field = doc.fields.find((entry) => entry.name === binding.field);
      if (field) assertBindingField(field, binding.target, node.id);
    }
    for (const binding of node.eventBindings ?? []) {
      if (!eventNames.has(binding.event)) {
        throw new DocumentError(
          'unknown-event',
          `Node "${node.id}" binds unknown event "${binding.event}"`,
        );
      }
      if (!binding.name.trim()) {
        throw new DocumentError('schema', `Event binding "${binding.event}" needs a native event`);
      }
      const event = events.find((entry) => entry.name === binding.event);
      for (const [key, source] of Object.entries(binding.payload ?? {})) {
        const type = event?.payload?.[key];
        const expected =
          type === 'boolean' ? 'checked' : type === 'number' ? 'valueAsNumber' : 'value';
        if (!type || source !== expected) {
          throw new DocumentError('schema', `Event payload "${key}" cannot read "${source}"`);
        }
      }
      if (event && Object.values(event.payload ?? {}).some(isStructuredFieldType)) {
        throw new DocumentError(
          'schema',
          `Event "${binding.event}" uses a structured payload and cannot be bound directly to a native event`,
        );
      }
    }
  }
}

function isStructuredFieldType(type: FieldDefinition['type']): boolean {
  return type === 'array' || type === 'object';
}

function assertBindingField(
  field: FieldDefinition,
  target: Binding['target'],
  nodeId: string,
): void {
  if (isStructuredFieldType(field.type)) {
    throw new DocumentError(
      'schema',
      `Binding "${field.name}" on node "${nodeId}" cannot use structured field type "${field.type}" for ${target}`,
    );
  }
  if (target === 'visible' && field.type !== 'boolean') {
    throw new DocumentError(
      'schema',
      `Binding "${field.name}" on node "${nodeId}" targeting visible needs a boolean field`,
    );
  }
}

function assertVariantFieldTargets(doc: FlatDocument, variant: VariantPreset): void {
  const overrides = variant.overrides;
  if (!overrides) return;
  const fields = new Set(doc.fields.map((field) => field.name));
  for (const fieldName of overrides.unsetFields ?? []) {
    if (!fields.has(fieldName)) {
      throw new DocumentError(
        'unknown-field',
        `Variant "${variant.name}" unsets unknown field "${fieldName}" on "${doc.id}"`,
      );
    }
    if (overrides.fields && Object.prototype.hasOwnProperty.call(overrides.fields, fieldName)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" cannot set and unset field "${fieldName}" together`,
      );
    }
  }
}

export function assertVariantTargets(doc: FlatDocument, variant: VariantPreset): void {
  const overrides = variant.overrides;
  if (!overrides) return;
  for (const target of Object.keys(overrides.nodes ?? {})) {
    if (!hasNodeTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" targets unknown node "${target}" on "${doc.id}"`,
      );
    }
  }
  for (const target of overrides.removed ?? []) {
    if (!hasNodeTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" removes unknown node "${target}" on "${doc.id}"`,
      );
    }
    if (isRootTarget(doc, target)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" cannot remove the root node "${doc.rootId}"`,
      );
    }
  }
  const removed = overrides.removed ?? [];
  for (const insertion of overrides.insertions ?? []) {
    if (!hasNodeTarget(doc, insertion.parent)) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" inserts under unknown node "${insertion.parent}" on "${doc.id}"`,
      );
    }
    if (
      removed.some(
        (target) => insertion.parent === target || insertion.parent.startsWith(`${target}.`),
      )
    ) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" cannot insert under removed node "${insertion.parent}"`,
      );
    }
    const parent = nodeForTarget(doc, insertion.parent);
    if (parent?.type !== 'frame') {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" can only insert under a frame ("${insertion.parent}")`,
      );
    }
  }
}

function hasNodeTarget(doc: FlatDocument, target: string): boolean {
  return Boolean(nodeForTarget(doc, target));
}

function isRootTarget(doc: FlatDocument, target: string): boolean {
  return target === doc.rootId || target === `${doc.rootId}`;
}

function nodeForTarget(doc: FlatDocument, target: string): FlatNode | undefined {
  const direct = doc.nodes[target];
  if (direct) return direct;
  const parts = target.split('.');
  if (parts[0] !== doc.rootId) return undefined;
  let current = doc.nodes[doc.rootId];
  for (const id of parts.slice(1)) {
    if (!current || current.type !== 'frame' || !current.children.includes(id)) return undefined;
    current = doc.nodes[id];
  }
  return current;
}
