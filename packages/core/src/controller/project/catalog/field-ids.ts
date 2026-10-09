import type { ProjectCatalog } from '@facadeur/domain';
import { createCatalogUuid } from '../../../document/ids';

export const COMPONENT_PROP_ID = 'x-facadeur-prop-id';

/** Add persistent ids to schema properties so bindings survive a field rename. */
export function ensureCatalogFieldIds(catalog: ProjectCatalog) {
  const next = structuredClone(catalog) as ProjectCatalog;
  let changed = false;
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    const schema = value as Record<string, unknown>;
    const output: Record<string, unknown> = { ...schema };
    if (schema.properties && typeof schema.properties === 'object') {
      const properties: Record<string, unknown> = {};
      for (const [name, property] of Object.entries(schema.properties as Record<string, unknown>)) {
        const normalized = normalize(property);
        if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
          const field = { ...(normalized as Record<string, unknown>) };
          if (typeof field[COMPONENT_PROP_ID] !== 'string') {
            field[COMPONENT_PROP_ID] = createCatalogUuid();
            changed = true;
          }
          properties[name] = field;
        } else properties[name] = normalized;
      }
      output.properties = properties;
    }
    for (const key of ['items', 'anyOf', 'oneOf', 'allOf', 'not', 'additionalProperties']) {
      if (key in schema) output[key] = normalize(schema[key]);
    }
    return output;
  };
  const schemas = { ...(next.schemas ?? {}) };
  for (const [uuid, schema] of Object.entries(schemas)) {
    schemas[uuid] = normalize(schema) as typeof schema;
  }
  const normalizeDefinition = (definition: ProjectCatalog['atoms'][string]) => {
    if (definition.schema.kind === 'inline') {
      const schema = normalize(definition.schema.schema) as typeof definition.schema.schema;
      if (schema !== definition.schema.schema) {
        return { ...definition, schema: { ...definition.schema, schema } };
      }
    }
    return definition;
  };
  const atoms = Object.fromEntries(
    Object.entries(next.atoms).map(([uuid, definition]) => [uuid, normalizeDefinition(definition)]),
  );
  const components = Object.fromEntries(
    Object.entries(next.components).map(([uuid, definition]) => [
      uuid,
      normalizeDefinition(definition),
    ]),
  );
  const pages = Object.fromEntries(
    Object.entries(next.pages).map(([uuid, definition]) => [uuid, normalizeDefinition(definition)]),
  );
  return {
    catalog: { ...next, schemas, atoms, components, pages },
    changed,
  };
}

export function componentPropIdFromSchemaProperty(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>)[COMPONENT_PROP_ID];
  return typeof id === 'string' ? id : null;
}

/** Carry ids across schema edits if a JSON Schema editor omits unknown field metadata. */
export function preserveFieldIds(previous: unknown, next: unknown): unknown {
  if (Array.isArray(next)) {
    return next.map((entry, index) =>
      preserveFieldIds(Array.isArray(previous) ? previous[index] : null, entry),
    );
  }
  if (!next || typeof next !== 'object') return next;
  const nextRecord = next as Record<string, unknown>;
  const previousRecord =
    previous && typeof previous === 'object' && !Array.isArray(previous)
      ? (previous as Record<string, unknown>)
      : {};
  const output: Record<string, unknown> = { ...nextRecord };
  const previousProperties =
    previousRecord.properties && typeof previousRecord.properties === 'object'
      ? (previousRecord.properties as Record<string, unknown>)
      : {};
  if (nextRecord.properties && typeof nextRecord.properties === 'object') {
    const properties: Record<string, unknown> = {};
    const nextProperties = nextRecord.properties as Record<string, unknown>;
    for (const [name, property] of Object.entries(nextProperties)) {
      const merged = preserveFieldIds(previousProperties[name], property);
      if (merged && typeof merged === 'object' && !Array.isArray(merged)) {
        const field = { ...(merged as Record<string, unknown>) };
        const previousId = componentPropIdFromSchemaProperty(previousProperties[name]);
        if (!componentPropIdFromSchemaProperty(field) && previousId) {
          field[COMPONENT_PROP_ID] = previousId;
        }
        properties[name] = field;
      } else properties[name] = merged;
    }
    const removedNames = Object.keys(previousProperties).filter(
      (name) => !(name in nextProperties),
    );
    const addedNames = Object.keys(nextProperties).filter(
      (name) =>
        !(name in previousProperties) && !componentPropIdFromSchemaProperty(properties[name]),
    );
    const unusedRemoved = new Set(removedNames);
    for (const name of addedNames) {
      const signature = schemaFieldSignature(nextProperties[name]);
      const matches = removedNames.filter(
        (oldName) =>
          unusedRemoved.has(oldName) &&
          schemaFieldSignature(previousProperties[oldName]) === signature,
      );
      if (matches.length !== 1) continue;
      const oldName = matches[0]!;
      const id = componentPropIdFromSchemaProperty(previousProperties[oldName]);
      if (!id || !properties[name] || typeof properties[name] !== 'object') continue;
      properties[name] = {
        ...(properties[name] as Record<string, unknown>),
        [COMPONENT_PROP_ID]: id,
      };
      unusedRemoved.delete(oldName);
    }
    const remainingAdded = addedNames.filter(
      (name) => !componentPropIdFromSchemaProperty(properties[name]),
    );
    if (unusedRemoved.size === 1 && remainingAdded.length === 1) {
      const oldName = [...unusedRemoved][0]!;
      const newName = remainingAdded[0]!;
      const id = componentPropIdFromSchemaProperty(previousProperties[oldName]);
      if (id && properties[newName] && typeof properties[newName] === 'object') {
        properties[newName] = {
          ...(properties[newName] as Record<string, unknown>),
          [COMPONENT_PROP_ID]: id,
        };
      }
    }
    output.properties = properties;
  }
  for (const key of ['items', 'anyOf', 'oneOf', 'allOf', 'not', 'additionalProperties']) {
    if (key in nextRecord) output[key] = preserveFieldIds(previousRecord[key], nextRecord[key]);
  }
  return output;
}

function schemaFieldSignature(value: unknown): string {
  const normalize = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(normalize);
    if (!entry || typeof entry !== 'object') return entry;
    return Object.fromEntries(
      Object.entries(entry as Record<string, unknown>)
        .filter(([key]) => key !== COMPONENT_PROP_ID && key !== 'title' && key !== 'description')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, normalize(child)]),
    );
  };
  return JSON.stringify(normalize(value));
}

export function componentPropsForSchema(schema: unknown): { uuid: string; name: string }[] {
  const output: { uuid: string; name: string }[] = [];
  const seenIds = new Set<string>();
  const seenPaths = new Set<string>();
  const visit = (value: unknown, prefix = '') => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const record = value as Record<string, unknown>;
    if (record.properties && typeof record.properties === 'object') {
      for (const [name, property] of Object.entries(record.properties as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${name}` : name;
        const uuid = componentPropIdFromSchemaProperty(property);
        if (uuid && !seenIds.has(uuid) && !seenPaths.has(path)) {
          seenIds.add(uuid);
          seenPaths.add(path);
          output.push({ uuid, name: `props.${path}` });
        }
        visit(property, path);
      }
    }
    for (const key of ['items', 'anyOf', 'oneOf', 'allOf']) {
      if (key in record) visit(record[key], prefix);
    }
  };
  visit(schema);
  return output;
}
