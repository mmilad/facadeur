import { DocumentError } from '../document/errors.js';
import { type FlatNode } from '../document/flat.js';
import { ID_PATTERN } from '../document/ids.js';
import {
  fieldTypes,
  type Binding,
  type DisplayOn,
  type EventBinding,
  type EventDefinition,
  type Expose,
  type FieldDefinition,
  type FieldValue,
  type Repeat,
  type VariantPreset,
} from '../document/schema.js';
import { parseLayout } from '../styles/layout.js';

const DATA_PATH = /^[A-Za-z_$][A-Za-z0-9_$-]*(\.[A-Za-z_$][A-Za-z0-9_$-]*)*$/;
const EXPOSE_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\.[A-Za-z][A-Za-z0-9_-]*)*$/;
const EVENT_ATTRIBUTE = /^on/i;

export function assertFieldDefinition(field: FieldDefinition): void {
  if (!fieldTypes.includes(field.type)) {
    throw new DocumentError('schema', `Unknown field type "${field.type}"`);
  }
  if (field.type === 'enum') {
    if (!field.options?.length) {
      throw new DocumentError('schema', `Enum field "${field.name}" needs options`);
    }
    if (new Set(field.options).size !== field.options.length) {
      throw new DocumentError('schema', `Enum field "${field.name}" has duplicate options`);
    }
  } else if (field.options) {
    throw new DocumentError('schema', `Only enum fields can have options ("${field.name}")`);
  }
  if (field.items && field.type !== 'array' && field.type !== 'object') {
    throw new DocumentError(
      'schema',
      `Only array and object fields can define items ("${field.name}")`,
    );
  }
  if (field.items?.options) {
    if (field.items.type !== 'enum') {
      throw new DocumentError('schema', `Only enum item fields can have options ("${field.name}")`);
    }
    if (new Set(field.items.options).size !== field.items.options.length) {
      throw new DocumentError('schema', `Enum item field "${field.name}" has duplicate options`);
    }
  } else if (field.items?.type === 'enum') {
    throw new DocumentError('schema', `Enum item field "${field.name}" needs options`);
  }
  if ((field.type === 'array' || field.type === 'object') && field.items) {
    if (field.type === 'array' && field.items.type === 'object' && !field.items.fields?.length) {
      throw new DocumentError('schema', `Object array field "${field.name}" needs item fields`);
    }
    const nestedNames = new Set<string>();
    for (const item of field.items.fields ?? []) {
      if (nestedNames.has(item.name)) {
        throw new DocumentError(
          'schema',
          `Duplicate nested field "${item.name}" in "${field.name}"`,
        );
      }
      nestedNames.add(item.name);
      assertFieldDefinition(item);
    }
  }
  if (field.default !== undefined) {
    assertValueMatches(field, field.default);
  }
}

export function assertEventDefinition(event: EventDefinition): void {
  if (!ID_PATTERN.test(event.name)) {
    throw new DocumentError('schema', `Invalid event name "${event.name}"`);
  }
  for (const [name, type] of Object.entries(event.payload ?? {})) {
    if (!ID_PATTERN.test(name) || !fieldTypes.includes(type)) {
      throw new DocumentError('schema', `Event "${event.name}" has an invalid payload`);
    }
  }
}

export function assertExpose(expose: Expose): void {
  const names = new Set<string>();
  for (const [kind, paths] of [
    ['field', expose.fields ?? {}],
    ['event', expose.events ?? {}],
  ] as const) {
    for (const [name, path] of Object.entries(paths)) {
      if (!ID_PATTERN.test(name)) {
        throw new DocumentError('schema', `Invalid exposed ${kind} name "${name}"`);
      }
      if (names.has(name)) {
        throw new DocumentError('schema', `Expose name "${name}" is used more than once`);
      }
      names.add(name);
      if (!EXPOSE_PATH.test(path)) {
        throw new DocumentError('schema', `Exposed ${kind} "${name}" needs a valid dot path`);
      }
    }
  }
}

export function assertVariantAxis(axis: {
  name: string;
  values: string[];
  default?: string;
}): void {
  if (!axis.values.length) {
    throw new DocumentError('schema', `Variant "${axis.name}" needs at least one value`);
  }
  if (new Set(axis.values).size !== axis.values.length) {
    throw new DocumentError('schema', `Variant "${axis.name}" has duplicate values`);
  }
  if (axis.default !== undefined && !axis.values.includes(axis.default)) {
    throw new DocumentError(
      'schema',
      `Variant default "${axis.default}" is not a value of "${axis.name}"`,
    );
  }
}

export function assertVariantPreset(variant: VariantPreset): void {
  const overrides = variant.overrides;
  if (variant.name === 'default' && hasVariantOverrides(overrides)) {
    throw new DocumentError(
      'schema',
      'The default variant is the base document and cannot contain overrides',
    );
  }
  if (!overrides) return;
  for (const node of Object.values(overrides.nodes ?? {})) {
    assertVariantUnsetPaths(variant.name, node);
    if (!node.displayOn) continue;
    const hasEquals = 'equals' in node.displayOn;
    const hasTruthy = 'truthy' in node.displayOn;
    if (hasEquals === hasTruthy) {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" displayOn needs exactly one of equals or truthy`,
      );
    }
  }
  for (const insertion of overrides.insertions ?? []) {
    if (!insertion.node || typeof insertion.node !== 'object') {
      throw new DocumentError(
        'schema',
        `Variant "${variant.name}" contains an invalid insertion node`,
      );
    }
  }
}

function hasVariantOverrides(overrides: VariantPreset['overrides']): boolean {
  if (!overrides) return false;
  return (
    Boolean(overrides.fields && Object.keys(overrides.fields).length > 0) ||
    Boolean(overrides.styles && Object.keys(overrides.styles).length > 0) ||
    Boolean(overrides.unsetFields?.length) ||
    Boolean(overrides.nodes && Object.keys(overrides.nodes).length > 0) ||
    Boolean(overrides.removed?.length) ||
    Boolean(overrides.insertions?.length)
  );
}

function assertVariantUnsetPaths(
  variantName: string,
  node: NonNullable<NonNullable<VariantPreset['overrides']>['nodes']>[string],
): void {
  const mapProperties = new Set(['attributes', 'fields', 'fieldBindings', 'variants', 'style']);
  const scalarProperties = new Set([
    'text',
    'src',
    'alt',
    'repeat',
    'layout',
    'bindings',
    'eventBindings',
    'variantRules',
    'displayOn',
  ]);
  const configured = new Set(Object.keys(node).filter((key) => key !== 'unset'));
  for (const path of node.unset ?? []) {
    const [property, key, ...rest] = path.split('.');
    if (
      !property ||
      rest.length > 0 ||
      (!mapProperties.has(property) && !scalarProperties.has(property))
    ) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" has an invalid unset path "${path}"`,
      );
    }
    if (key && !mapProperties.has(property)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot unset a nested property "${path}"`,
      );
    }
    if (!key && mapProperties.has(property) && configured.has(property)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot set and unset "${property}" together`,
      );
    }
    if (!key && scalarProperties.has(property) && configured.has(property)) {
      throw new DocumentError(
        'schema',
        `Variant "${variantName}" cannot set and unset "${property}" together`,
      );
    }
    if (key && configured.has(property)) {
      const values = (node as Record<string, unknown>)[property];
      if (values && typeof values === 'object' && key in (values as object)) {
        throw new DocumentError(
          'schema',
          `Variant "${variantName}" cannot set and unset "${path}" together`,
        );
      }
    }
  }
}

export function assertValueMatches(field: FieldDefinition, value: FieldValue): void {
  const label = `Field "${field.name}"`;
  switch (field.type) {
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new DocumentError('schema', `${label} expects a boolean`);
      }
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new DocumentError('schema', `${label} expects a finite number`);
      }
      return;
    case 'enum':
      if (typeof value !== 'string' || !field.options?.includes(value)) {
        throw new DocumentError('schema', `${label} must be one of ${field.options?.join(', ')}`);
      }
      return;
    case 'array': {
      if (!Array.isArray(value)) throw new DocumentError('schema', `${label} expects an array`);
      if (!field.items) return;
      const itemField: FieldDefinition = {
        name: `${field.name}[]`,
        type: field.items.type,
        ...(field.items.options ? { options: field.items.options } : {}),
        ...(field.items.fields
          ? { items: { type: field.items.type, fields: field.items.fields } }
          : {}),
      };
      for (const item of value) assertValueMatches(itemField, item);
      return;
    }
    case 'object':
      if (!isRecord(value)) throw new DocumentError('schema', `${label} expects an object`);
      for (const definition of field.items?.fields ?? []) {
        const nested = value[definition.name];
        if (nested !== undefined) assertValueMatches(definition, nested);
        else if (definition.required && definition.default === undefined) {
          throw new DocumentError('schema', `${label} is missing "${definition.name}"`);
        }
      }
      return;
    default:
      if (typeof value !== 'string') {
        throw new DocumentError('schema', `${label} expects a string`);
      }
  }
}

export function assertAttributes(attributes: Record<string, string> | undefined): void {
  if (!attributes) return;
  for (const key of Object.keys(attributes)) {
    if (EVENT_ATTRIBUTE.test(key)) {
      throw new DocumentError('schema', `Attribute "${key}" is not allowed`);
    }
  }
}

export function assertBindings(bindings: Binding[] | undefined): void {
  for (const binding of bindings ?? []) {
    if ((binding.target === 'attribute' || binding.target === 'style') && !binding.name) {
      throw new DocumentError(
        'schema',
        `Binding "${binding.field}" targeting ${binding.target} needs a name`,
      );
    }
    if (binding.target === 'attribute' && binding.name && EVENT_ATTRIBUTE.test(binding.name)) {
      throw new DocumentError('schema', `Binding attribute "${binding.name}" is not allowed`);
    }
  }
}

export function assertDisplayOn(value: unknown): asserts value is DisplayOn {
  if (!isRecord(value) || typeof value.path !== 'string' || !DATA_PATH.test(value.path)) {
    throw new DocumentError('schema', 'Display conditions need a valid data path');
  }
  const hasEquals = value.equals !== undefined;
  const hasTruthy = value.truthy !== undefined;
  if (hasEquals && !isFieldValueValue(value.equals)) {
    throw new DocumentError('schema', 'Display condition values must be valid field values');
  }
  if (hasEquals === hasTruthy || (hasTruthy && typeof value.truthy !== 'boolean')) {
    throw new DocumentError('schema', 'Display conditions need exactly one of equals or truthy');
  }
}

export function assertRepeat(value: unknown): asserts value is Repeat {
  if (!isRecord(value) || typeof value.path !== 'string' || !DATA_PATH.test(value.path)) {
    throw new DocumentError('schema', 'Repeats need a valid array data path');
  }
  if (value.as !== undefined && (typeof value.as !== 'string' || !ID_PATTERN.test(value.as))) {
    throw new DocumentError('schema', 'Repeat aliases must be valid identifiers');
  }
  if (value.key !== undefined && (typeof value.key !== 'string' || !DATA_PATH.test(value.key))) {
    throw new DocumentError('schema', 'Repeat keys need a valid data path');
  }
}

export function assertEventBindings(value: unknown): asserts value is EventBinding[] {
  if (value === undefined) return;
  if (!Array.isArray(value)) throw new DocumentError('schema', 'Event bindings must be an array');
  for (const binding of value) {
    if (
      !isRecord(binding) ||
      typeof binding.event !== 'string' ||
      !ID_PATTERN.test(binding.event) ||
      typeof binding.name !== 'string' ||
      !binding.name.trim()
    ) {
      throw new DocumentError('schema', 'Each event binding needs an event and native event name');
    }
  }
}

export function assertFieldBindings(value: unknown): asserts value is Record<string, string> {
  if (!isRecord(value)) {
    throw new DocumentError('schema', 'Field bindings must be an object of data paths');
  }
  for (const [field, path] of Object.entries(value)) {
    if (!ID_PATTERN.test(field) || typeof path !== 'string' || !DATA_PATH.test(path)) {
      throw new DocumentError('schema', 'Each field binding needs a field name and data path');
    }
  }
}

export function assertLayout(layout: NonNullable<FlatNode['layout']>): void {
  parseLayout(layout);
}

export function isRecord(value: unknown): value is Record<string, FieldValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFieldValueValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFieldValueValue);
  if (isRecord(value)) return Object.values(value).every(isFieldValueValue);
  return false;
}
