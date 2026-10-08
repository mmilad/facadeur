import { DocumentError } from '../../document/errors';
import { isPlainObject as isRecord } from '../../utils';
import { type FlatNode } from '../../document/flat';
import { ID_PATTERN } from '../../document/ids';
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
} from '../../schema/document';
import { parseLayout } from '../style/layout';
import { matchesLegacyStructuralValue, matchesSchemaValue } from './json-schema-value';

const DATA_PATH = /^[A-Za-z_$][A-Za-z0-9_$-]*(\.[A-Za-z_$][A-Za-z0-9_$-]*)*$/;
const EXPOSE_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\.[A-Za-z][A-Za-z0-9_-]*)*$/;
const CHILD_FIELD_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\/[A-Za-z][A-Za-z0-9_-]*)*$/;
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
    if (
      field.type === 'array' &&
      field.items.type === 'object' &&
      !field.items.fields?.length &&
      !field.items.schema
    ) {
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
  if (event.payload && event.data) {
    throw new DocumentError('schema', `Event "${event.name}" cannot define both payload and data`);
  }
  if (event.data) {
    const hasDirect = event.data.direct !== undefined;
    const hasFields = event.data.fields !== undefined;
    if (hasDirect === hasFields || (hasFields && event.data.fields!.length === 0)) {
      throw new DocumentError(
        'schema',
        `Event "${event.name}" data needs exactly one direct type or non-empty fields list`,
      );
    }
    const names = new Set<string>();
    for (const field of event.data.fields ?? []) {
      if (!ID_PATTERN.test(field.name) || names.has(field.name)) {
        throw new DocumentError(
          'schema',
          `Event "${event.name}" has invalid or duplicate data fields`,
        );
      }
      names.add(field.name);
      if (!isSchemaTypeRef(field.type)) {
        throw new DocumentError('schema', `Event "${event.name}" has an invalid data field type`);
      }
    }
    if (event.data.direct && !isSchemaTypeRef(event.data.direct)) {
      throw new DocumentError('schema', `Event "${event.name}" has an invalid direct data type`);
    }
  }
}

function isSchemaTypeRef(
  value: unknown,
): value is { kind: 'type'; type: string } | { kind: 'schema'; schemaId: string } {
  if (!isRecord(value)) return false;
  if (value.kind === 'type') {
    return ['string', 'number', 'integer', 'boolean', 'object', 'array'].includes(
      String(value.type),
    );
  }
  return value.kind === 'schema' && typeof value.schemaId === 'string' && value.schemaId.length > 0;
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

function hasVariantOverrides(overrides: VariantPreset['overrides']) {
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
) {
  const mapProperties = new Set([
    'attributes',
    'fields',
    'fieldBindings',
    'variants',
    'style',
    'childFields',
  ]);
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
    if (property === 'childFields') {
      if (!key || rest.length > 1) {
        if (!key && configured.has(property)) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" cannot set and unset "${property}" together`,
          );
        }
        if (rest.length > 1) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" has an invalid unset path "${path}"`,
          );
        }
      } else if (configured.has(property)) {
        const values = (node as Record<string, unknown>)[property];
        const pathValues =
          values && typeof values === 'object'
            ? (values as Record<string, unknown>)[key]
            : undefined;
        if (rest.length === 0 && pathValues !== undefined) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" cannot set and unset "${path}" together`,
          );
        }
        const fieldName = rest[0];
        if (
          rest.length === 1 &&
          fieldName &&
          pathValues &&
          typeof pathValues === 'object' &&
          fieldName in (pathValues as object)
        ) {
          throw new DocumentError(
            'schema',
            `Variant "${variantName}" cannot set and unset "${path}" together`,
          );
        }
      }
      continue;
    }
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
  if (field.schema) {
    if (
      !matchesSchemaValue(value, field.schema) &&
      !matchesLegacyStructuralValue(value, field.schema)
    ) {
      throw new DocumentError('schema', `${label} does not match its JSON Schema contract`);
    }
    return;
  }
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
        ...(field.items.schema ? { schema: field.items.schema } : {}),
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
