import { DocumentError } from '../../document/errors.js';
import type { FlatNode } from '../../document/flat.js';
import type {
  DocumentFile,
  EventDefinition,
  FieldDefinition,
  NestedNode,
  SchemaCatalog,
} from '../../schema/document.js';
import { localContractFieldsFor } from './schema-use.js';

import type {
  ContractDocument,
  ContractResolverInput,
  SchemaResolverContext,
  AutomaticFieldGroup,
} from './types.js';

export function validateExposedContracts(
  document: DocumentFile,
  catalog: ReadonlyMap<string, DocumentFile>,
  schemaCatalog?: SchemaCatalog,
) {
  const context = resolverContext(catalog, schemaCatalog);
  const directFields = new Set(localContractFieldsFor(document, schemaCatalog).keys());
  const directEvents = new Set((document.events ?? []).map((event) => event.name));
  for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
    if (directFields.has(name)) {
      throw new DocumentError(
        'schema',
        `Exposed field "${name}" on "${document.id}" collides with a direct field`,
      );
    }
    const field = resolveExposedField(document, path, context, new Set());
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

/** Resolve a component's public fields, including fields forwarded by child instances. */
export function publicFieldsFor(
  document: ContractDocument,
  catalog: ContractResolverInput,
): Map<string, FieldDefinition> {
  return resolvePublicFields(document, resolverContext(catalog), new Set());
}

export function resolveComponentContract(
  document: ContractDocument,
  context: SchemaResolverContext,
): Map<string, FieldDefinition> {
  return resolvePublicFields(document, context, new Set());
}

/** Describe the contributing child instances in the order their fields are applied. */
export function automaticFieldGroupsFor(
  document: ContractDocument,
  catalog: ContractResolverInput,
) {
  return collectAutomaticFieldGroups(document, resolverContext(catalog), new Set([document.id]));
}

/** Backwards-compatible internal name; all field semantics live in `publicFieldsFor`. */
export function exposedFields(
  document: DocumentFile,
  catalog: ContractResolverInput,
  seen = new Set<string>(),
): Map<string, FieldDefinition> {
  return resolvePublicFields(document, resolverContext(catalog), seen);
}

function resolvePublicFields(
  document: ContractDocument,
  context: SchemaResolverContext,
  ancestors: ReadonlySet<string>,
): Map<string, FieldDefinition> {
  const fields = localContractFieldsFor(document, context.schemaCatalog);
  if (ancestors.has(document.id)) return fields;
  const nextAncestors = new Set(ancestors).add(document.id);

  for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
    if (fields.has(name)) continue;
    let definition: FieldDefinition | undefined;
    try {
      definition = resolveExposedField(document, path, context, new Set(), nextAncestors);
    } catch (error) {
      // Keep editing malformed contracts possible. `validateExposedContracts` remains
      // the strict gate used when saving or validating the catalog.
      if (!(error instanceof DocumentError)) throw error;
    }
    if (definition) fields.set(name, { ...definition, name });
  }

  for (const group of collectAutomaticFieldGroups(document, context, nextAncestors)) {
    if (!group.enabled) continue;
    for (const definition of group.fields) {
      fields.delete(definition.name);
      fields.set(definition.name, definition);
    }
  }
  return fields;
}

function collectAutomaticFieldGroups(
  document: ContractDocument,
  context: SchemaResolverContext,
  ancestors: ReadonlySet<string>,
) {
  const groups: AutomaticFieldGroup[] = [];
  for (const instance of instancesInDocumentOrder(document)) {
    const target = context.documents.get(instance.component);
    if (!target) continue;
    groups.push({
      instanceId: instance.id,
      componentId: target.id,
      componentName: target.name,
      enabled: instance.forwardFields !== false,
      fields: [...resolvePublicFields(target, context, ancestors).values()],
    });
  }
  return groups;
}

export function resolveExposedField(
  document: ContractDocument,
  path: string,
  catalog: ContractResolverInput,
  seen: Set<string>,
  ancestors: ReadonlySet<string> = new Set(),
): FieldDefinition | undefined {
  const context = resolverContext(catalog);
  const key = `${document.id}:${path}`;
  if (seen.has(key)) throw new DocumentError('schema', `Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findInstance(document, nodeId);
  if (!node || rest.length === 0) {
    throw new DocumentError('schema', `Expose path "${path}" on "${document.id}" is invalid`);
  }
  const child = context.documents.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const childFields = resolvePublicFields(child, context, ancestors);
  const publicField = childFields.get(member);
  if (publicField) return publicField;

  // Keep strict cycle diagnostics for expose chains while public field lookup
  // also sees automatically forwarded fields on the child contract.
  const nested = child.expose?.fields?.[member];
  return nested
    ? resolveExposedField(child, nested, context, seen, new Set(ancestors).add(document.id))
    : undefined;
}

function resolverContext(value: ContractResolverInput, schemaCatalog?: SchemaCatalog) {
  if ('documents' in value) return value;
  return { documents: value, ...(schemaCatalog ? { schemaCatalog } : {}) };
}

export function resolveExposedEvent(
  document: DocumentFile,
  path: string,
  catalog: ReadonlyMap<string, DocumentFile>,
  seen: Set<string>,
): EventDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) throw new DocumentError('schema', `Cyclic expose path "${path}"`);
  seen.add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = findInstance(document, nodeId);
  if (!node || rest.length === 0) {
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

function instancesInDocumentOrder(document: ContractDocument) {
  const instances: Array<{ id: string; component: string; forwardFields?: boolean }> = [];
  if ('root' in document) {
    const visit = (node: NestedNode) => {
      if (node.type === 'instance') instances.push(node);
      else if (node.type === 'frame') {
        for (const child of node.children ?? []) visit(child);
      }
    };
    visit(document.root);
    return instances;
  }
  const visit = (id: string) => {
    const node: FlatNode | undefined = document.nodes[id];
    if (!node) return;
    if (node.type === 'instance') instances.push(node);
    else if (node.type === 'frame') {
      for (const childId of node.children) visit(childId);
    }
  };
  visit(document.rootId);
  return instances;
}

function findInstance(
  document: ContractDocument,
  id: string | undefined,
): Extract<NestedNode, { type: 'instance' }> | Extract<FlatNode, { type: 'instance' }> | undefined {
  if (!id) return undefined;
  if ('root' in document) return findNestedInstance(document.root, id);
  const visit = (
    node: FlatNode | undefined,
  ): Extract<FlatNode, { type: 'instance' }> | undefined => {
    if (!node) return undefined;
    if (node.type === 'instance') return node.id === id ? node : undefined;
    if (node.type !== 'frame') return undefined;
    for (const childId of node.children) {
      const found = visit(document.nodes[childId]);
      if (found) return found;
    }
    return undefined;
  };
  return visit(document.nodes[document.rootId]);
}

function findNestedInstance(
  node: NestedNode,
  id: string,
): Extract<NestedNode, { type: 'instance' }> | undefined {
  if (node.type === 'instance') return node.id === id ? node : undefined;
  if (node.type !== 'frame') return undefined;
  for (const child of node.children ?? []) {
    const found = findNestedInstance(child, id);
    if (found) return found;
  }
  return undefined;
}
