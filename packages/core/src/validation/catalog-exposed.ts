import { DocumentError } from '../document/errors.js';
import { type NestedNode } from '../document/schema.js';
import {
  type DocumentFile,
  type EventDefinition,
  type FieldDefinition,
} from '../document/schema.js';

export function validateExposedContracts(
  document: DocumentFile,
  catalog: Map<string, DocumentFile>,
): void {
  const directFields = new Set((document.fields ?? []).map((field) => field.name));
  const directEvents = new Set((document.events ?? []).map((event) => event.name));
  for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
    if (directFields.has(name)) {
      throw new DocumentError(
        'schema',
        `Exposed field "${name}" on "${document.id}" collides with a direct field`,
      );
    }
    const field = resolveExposedField(document, path, catalog, new Set());
    if (!field) {
      throw new DocumentError(
        'unknown-field',
        `Exposed field "${name}" on "${document.id}" does not resolve a child field`,
      );
    }
  }
  for (const [name, path] of Object.entries(document.expose?.events ?? {})) {
    if (directEvents.has(name)) {
      throw new DocumentError(
        'schema',
        `Exposed event "${name}" on "${document.id}" collides with a direct event`,
      );
    }
    const event = resolveExposedEvent(document, path, catalog, new Set());
    if (!event) {
      throw new DocumentError(
        'unknown-event',
        `Exposed event "${name}" on "${document.id}" does not resolve a child event`,
      );
    }
  }
}

export function exposedFields(
  document: DocumentFile,
  catalog: Map<string, DocumentFile>,
  seen = new Set<string>(),
): Map<string, FieldDefinition> {
  const fields = new Map((document.fields ?? []).map((field) => [field.name, field]));
  for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
    const field = resolveExposedField(document, path, catalog, new Set(seen));
    if (field) fields.set(name, field);
  }
  return fields;
}

export function resolveExposedField(
  document: DocumentFile,
  path: string,
  catalog: Map<string, DocumentFile>,
  seen: Set<string>,
): FieldDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) throw new DocumentError('schema', `Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findNestedNode(document.root, nodeId);
  if (!node || node.type !== 'instance' || rest.length === 0) {
    throw new DocumentError('schema', `Expose path "${path}" on "${document.id}" is invalid`);
  }
  const child = catalog.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const direct = child.fields?.find((field) => field.name === member);
  if (direct) return direct;
  const nested = child.expose?.fields?.[member];
  return nested ? resolveExposedField(child, nested, catalog, seen) : undefined;
}

export function resolveExposedEvent(
  document: DocumentFile,
  path: string,
  catalog: Map<string, DocumentFile>,
  seen: Set<string>,
): EventDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) throw new DocumentError('schema', `Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findNestedNode(document.root, nodeId);
  if (!node || node.type !== 'instance' || rest.length === 0) {
    throw new DocumentError('schema', `Expose path "${path}" on "${document.id}" is invalid`);
  }
  const child = catalog.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const direct = child.events?.find((event) => event.name === member);
  if (direct) return direct;
  const nested = child.expose?.events?.[member];
  return nested ? resolveExposedEvent(child, nested, catalog, seen) : undefined;
}

function findNestedNode(node: NestedNode, id: string | undefined): NestedNode | undefined {
  if (!id) return undefined;
  if (node.id === id) return node;
  if (node.type !== 'frame') return undefined;
  for (const child of node.children ?? []) {
    const found = findNestedNode(child, id);
    if (found) return found;
  }
  return undefined;
}
