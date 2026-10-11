import { DocumentError } from '../../../document/errors';
import { type FlatNode } from '../../../document/flat';
import { ID_PATTERN } from '../../../document/ids';
import { isPlainObject as isRecord } from '../../../utils';
import type {
  Binding,
  DisplayOn,
  EventBinding,
  FieldValue,
  Repeat,
} from '../../../schema/document';
import { parseLayout } from '../../style/layout';

const DATA_PATH = /^[A-Za-z_$][A-Za-z0-9_$-]*(\.[A-Za-z_$][A-Za-z0-9_$-]*)*$/;
const CHILD_FIELD_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\/[A-Za-z][A-Za-z0-9_-]*)*$/;
const EVENT_ATTRIBUTE = /^on/i;

export function assertAttributes(attributes: Record<string, string> | undefined) {
  if (!attributes) return;
  for (const key of Object.keys(attributes)) {
    if (EVENT_ATTRIBUTE.test(key)) {
      throw new DocumentError('schema', `Attribute "${key}" is not allowed`);
    }
  }
}

export function assertBindings(bindings: Binding[] | undefined) {
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
    if (binding.data !== undefined) {
      if (binding.payload !== undefined) {
        throw new DocumentError(
          'schema',
          `Event binding "${binding.event}" cannot define both payload and data mappings`,
        );
      }
      if (!Array.isArray(binding.data))
        throw new DocumentError('schema', 'Event data mappings must be an array');
      for (const mapping of binding.data) {
        if (
          !isRecord(mapping) ||
          typeof mapping.path !== 'string' ||
          (mapping.path !== '' && !DATA_PATH.test(mapping.path))
        ) {
          throw new DocumentError('schema', 'Event data mappings need valid destination paths');
        }
        const source = mapping.source;
        if (!isRecord(source))
          throw new DocumentError('schema', 'Event data mappings need a source');
        if (source.kind === 'native') {
          if (
            ![
              'currentTarget.value',
              'currentTarget.checked',
              'currentTarget.valueAsNumber',
            ].includes(String(source.path))
          ) {
            throw new DocumentError(
              'schema',
              'Event data mappings use an unsupported native source',
            );
          }
        } else if (source.kind === 'context') {
          if (typeof source.path !== 'string' || !DATA_PATH.test(source.path)) {
            throw new DocumentError('schema', 'Event data context sources need a valid data path');
          }
        } else if (source.kind === 'literal') {
          if (!isFieldValueValue(source.value))
            throw new DocumentError('schema', 'Event data literals must be field values');
        } else {
          throw new DocumentError('schema', 'Event data mappings use an unsupported source');
        }
      }
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

export function assertChildFields(
  value: unknown,
): asserts value is Record<string, Record<string, FieldValue>> {
  if (!isRecord(value)) throw new DocumentError('schema', 'Child fields must be an object');
  for (const [path, fields] of Object.entries(value)) {
    if (!CHILD_FIELD_PATH.test(path) || !isRecord(fields)) {
      throw new DocumentError('schema', 'Each child field override needs a valid instance path');
    }
    for (const [field, item] of Object.entries(fields)) {
      if (!ID_PATTERN.test(field) || !isFieldValueValue(item)) {
        throw new DocumentError('schema', 'Each child field override needs a valid field value');
      }
    }
  }
}

export function assertLayout(layout: NonNullable<FlatNode['layout']>) {
  parseLayout(layout);
}

function isFieldValueValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFieldValueValue);
  if (isRecord(value)) return Object.values(value).every(isFieldValueValue);
  return false;
}
