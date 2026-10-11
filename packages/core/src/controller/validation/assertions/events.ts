import { DocumentError } from '../../../document/errors';
import { ID_PATTERN } from '../../../document/ids';
import { fieldTypes, type EventDefinition, type Expose } from '../../../schema/document';
import { isPlainObject as isRecord } from '../../../utils';

const EXPOSE_PATH = /^[A-Za-z][A-Za-z0-9_-]*(\.[A-Za-z][A-Za-z0-9_-]*)*$/;

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
