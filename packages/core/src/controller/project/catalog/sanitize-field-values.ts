import type { FieldValue, Node, NodeDefinition, ProjectCatalog } from '@facadeur/domain';

/** Drop null/undefined leaves so TypeBox field-value validation does not throw. */
export function sanitizeFieldValue(value: unknown): FieldValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    const items = value
      .map((entry) => sanitizeFieldValue(entry))
      .filter((entry): entry is FieldValue => entry !== undefined);
    return items;
  }
  if (typeof value === 'object') {
    const out: Record<string, FieldValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      const sanitized = sanitizeFieldValue(entry);
      if (sanitized !== undefined) out[key] = sanitized;
    }
    return out;
  }
  return undefined;
}

export function sanitizeFieldValueRecord(
  record: Readonly<Record<string, unknown>> | undefined,
): Record<string, FieldValue> | undefined {
  if (!record) return undefined;
  const out: Record<string, FieldValue> = {};
  for (const [key, value] of Object.entries(record)) {
    const sanitized = sanitizeFieldValue(value);
    if (sanitized !== undefined) out[key] = sanitized;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizeNode(node: Node): Node {
  const data = sanitizeFieldValueRecord(node.data as Record<string, unknown> | undefined);
  const properties = sanitizeFieldValueRecord(
    node.dom.properties as Record<string, unknown> | undefined,
  );
  const children = node.dom.children?.map(sanitizeNode);
  const { properties: _properties, children: _children, ...domBase } = node.dom;
  const { data: _data, ...nodeBase } = node;
  return {
    ...nodeBase,
    ...(data ? { data } : {}),
    dom: {
      ...domBase,
      ...(properties ? { properties } : {}),
      ...(children ? { children } : {}),
    },
  };
}

function sanitizeDefinition(definition: NodeDefinition): NodeDefinition {
  const root = sanitizeNode(definition.root);
  const config = definition.config;
  if (!config?.previewData) {
    return root === definition.root ? definition : { ...definition, root };
  }
  const { fields: _fields, ...previewDataExtras } = config.previewData as Readonly<
    Record<string, unknown>
  >;
  const fields = sanitizeFieldValueRecord(
    config.previewData.fields as Record<string, unknown> | undefined,
  );
  const previewData =
    fields || Object.keys(previewDataExtras).length
      ? { ...previewDataExtras, ...(fields ? { fields } : {}) }
      : undefined;
  const nextConfig = { ...config };
  if (previewData) nextConfig.previewData = previewData;
  else delete nextConfig.previewData;
  return {
    ...definition,
    root,
    config: nextConfig,
  };
}

function sanitizeDefinitionMap(
  map: Readonly<Record<string, NodeDefinition>>,
): Record<string, NodeDefinition> {
  const out: Record<string, NodeDefinition> = {};
  for (const [id, definition] of Object.entries(map)) {
    out[id] = sanitizeDefinition(definition);
  }
  return out;
}

/** Normalize catalog field-value slots before schema validation. */
export function sanitizeProjectCatalog(catalog: ProjectCatalog): ProjectCatalog {
  return {
    ...catalog,
    atoms: sanitizeDefinitionMap(catalog.atoms),
    components: sanitizeDefinitionMap(catalog.components),
    pages: sanitizeDefinitionMap(catalog.pages),
  };
}
