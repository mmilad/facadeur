import { DocumentError } from '../../../../document/errors.js';
import type { FlatDocument } from '../../../../document/flat.js';
import { ID_PATTERN, TAG_PATTERN } from '../../../../document/ids.js';
import { isPlainObject as isRecord } from '../../../../document/json.js';
import type { Binding, FieldValue } from '../../../../document/schema.js';
import { parseLayout } from '../../../style/layout.js';

export function requireNode(doc: FlatDocument, id: string) {
  const node = doc.nodes[id];
  if (!node) throw new DocumentError('missing-node', `Node "${id}" is not in the document`);
  return node;
}

export function requireFrame(doc: FlatDocument, id: string) {
  const node = requireNode(doc, id);
  if (node.type !== 'frame') {
    throw new DocumentError('invalid-parent', `Node "${id}" cannot contain children`);
  }
  return node;
}

export function assertIndex(index: number, length: number) {
  if (!Number.isInteger(index) || index < 0 || index > length) {
    throw new DocumentError('schema', `Index ${index} is outside 0..${length}`);
  }
}

export function requireName(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new DocumentError('schema', 'Name must be a non-empty string');
  }
  return value;
}

export function requireTag(value: unknown) {
  if (typeof value !== 'string' || !TAG_PATTERN.test(value)) {
    throw new DocumentError('schema', 'Tag must be an HTML tag name');
  }
  return value;
}

export function requireString(value: unknown, label: string) {
  if (typeof value !== 'string') {
    throw new DocumentError('schema', `${label} must be a string`);
  }
  return value;
}

export function requireStringRecord(value: unknown, label: string) {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} must be an object of strings`);
  const next: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new DocumentError('schema', `${label}.${key} must be a string`);
    }
    next[key] = item;
  }
  return next;
}

export function requireLayout(value: unknown) {
  return parseLayout(value);
}

export function requireBindings(value: unknown) {
  if (!Array.isArray(value)) throw new DocumentError('schema', 'Bindings must be an array');
  return value.map((item) => {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.target !== 'string') {
      throw new DocumentError('schema', 'Each binding needs a field and a target');
    }
    if (!isBindingTarget(item.target)) {
      throw new DocumentError('schema', `Unknown binding target "${item.target}"`);
    }
    const binding: Binding = { field: item.field, target: item.target };
    if (item.name !== undefined) {
      if (typeof item.name !== 'string' || !item.name) {
        throw new DocumentError('schema', 'Binding name must be a non-empty string');
      }
      binding.name = item.name;
    }
    return binding;
  });
}

export function isFieldValue(value: unknown): value is FieldValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isFieldValue);
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).every(isFieldValue);
  }
  return false;
}

export function isBindingTarget(value: string): value is Binding['target'] {
  return (
    value === 'text' ||
    value === 'attribute' ||
    value === 'style' ||
    value === 'visible' ||
    value === 'src' ||
    value === 'alt'
  );
}

export { ID_PATTERN };
