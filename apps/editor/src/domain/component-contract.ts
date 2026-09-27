import type { EventDefinition, FieldDefinition, FlatDocument } from '@facadeur/core';

/**
 * Return the fields a component makes public to its instances.
 *
 * Direct fields stay unchanged. Exposed fields are copied under their public
 * name so instance overrides use the same contract that validation and codegen
 * already understand. Expose paths may cross more than one component layer.
 */
export function publicFieldsFor(
  document: FlatDocument,
  catalog: ReadonlyMap<string, FlatDocument>,
): FieldDefinition[] {
  const fields = new Map((document.fields ?? []).map((field) => [field.name, field]));
  for (const [name, path] of Object.entries(document.expose?.fields ?? {})) {
    if (fields.has(name)) continue;
    const resolved = resolveField(document, path, catalog);
    if (resolved) fields.set(name, { ...resolved, name });
  }
  return [...fields.values()];
}

/**
 * Return the events a component makes public to its instances.
 *
 * Direct events stay unchanged. Exposed events are resolved through the
 * nested component catalog and copied under their public name, matching the
 * field contract above and the codegen contract.
 */
export function publicEventsFor(
  document: FlatDocument,
  catalog: ReadonlyMap<string, FlatDocument>,
): EventDefinition[] {
  const events = new Map((document.events ?? []).map((event) => [event.name, event]));
  for (const [name, path] of Object.entries(document.expose?.events ?? {})) {
    if (events.has(name)) continue;
    const resolved = resolveEvent(document, path, catalog);
    if (resolved) events.set(name, { ...resolved, name });
  }
  return [...events.values()];
}

function resolveField(
  document: FlatDocument,
  path: string,
  catalog: ReadonlyMap<string, FlatDocument>,
  seen = new Set<string>(),
): FieldDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) return undefined;
  const nextSeen = new Set(seen).add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = nodeId ? document.nodes[nodeId] : undefined;
  if (!node || node.type !== 'instance' || rest.length === 0) return undefined;

  const child = catalog.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const direct = child.fields.find((field) => field.name === member);
  if (direct) return direct;

  const nestedPath = child.expose?.fields?.[member];
  return nestedPath ? resolveField(child, nestedPath, catalog, nextSeen) : undefined;
}

function resolveEvent(
  document: FlatDocument,
  path: string,
  catalog: ReadonlyMap<string, FlatDocument>,
  seen = new Set<string>(),
): EventDefinition | undefined {
  const key = `${document.id}:${path}`;
  if (seen.has(key)) return undefined;
  const nextSeen = new Set(seen).add(key);
  const [nodeId, ...rest] = path.split('.');
  const node = nodeId ? document.nodes[nodeId] : undefined;
  if (!node || node.type !== 'instance' || rest.length === 0) return undefined;

  const child = catalog.get(node.component);
  if (!child) return undefined;
  const member = rest.join('.');
  const direct = child.events?.find((event) => event.name === member);
  if (direct) return direct;

  const nestedPath = child.expose?.events?.[member];
  return nestedPath ? resolveEvent(child, nestedPath, catalog, nextSeen) : undefined;
}
