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

function sanitizeNode(
  node: Node,
  legacyExposures: Record<string, unknown>,
  collectExposure = true,
): Node {
  const data = sanitizeFieldValueRecord(node.data as Record<string, unknown> | undefined);
  const properties = sanitizeFieldValueRecord(
    node.dom.properties as Record<string, unknown> | undefined,
  );
  const children = node.dom.children?.map((child) =>
    sanitizeNode(child, legacyExposures, collectExposure && !node.config?.definitionRef),
  );
  const { properties: _properties, children: _children, ...domBase } = node.dom;
  const { data: _data, config: _nodeConfig, ...nodeBase } = node;
  const originalConfig = node.config as Readonly<Record<string, unknown>> | undefined;
  const nodeConfig = originalConfig ? { ...originalConfig } : undefined;
  if (nodeConfig && Object.prototype.hasOwnProperty.call(nodeConfig, 'fieldExposure')) {
    if (collectExposure && nodeConfig.fieldExposure !== undefined)
      legacyExposures[node.uuid] = nodeConfig.fieldExposure;
    delete nodeConfig.fieldExposure;
  }
  return {
    ...nodeBase,
    ...(nodeConfig && Object.keys(nodeConfig).length
      ? { config: nodeConfig as Node['config'] }
      : {}),
    ...(data ? { data } : {}),
    dom: {
      ...domBase,
      ...(properties ? { properties } : {}),
      ...(children ? { children } : {}),
    },
  };
}

function sanitizeDefinition(definition: NodeDefinition): NodeDefinition {
  const legacyExposures: Record<string, unknown> = {};
  const root = sanitizeNode(definition.root, legacyExposures);
  const originalConfig = definition.config as Readonly<Record<string, unknown>> | undefined;
  const nextConfig = { ...(originalConfig ?? {}) };
  const legacyDefinitionExposure = nextConfig.fieldExposure;
  delete nextConfig.fieldExposure;
  const rootExposureMap =
    legacyDefinitionExposure &&
    typeof legacyDefinitionExposure === 'object' &&
    !Array.isArray(legacyDefinitionExposure) &&
    !('mode' in legacyDefinitionExposure)
      ? (legacyDefinitionExposure as Record<string, unknown>)
      : {};
  const fieldExposure = { ...legacyExposures, ...rootExposureMap };
  if (Object.keys(fieldExposure).length) nextConfig.fieldExposure = fieldExposure;

  const previewData = nextConfig.previewData as Readonly<Record<string, unknown>> | undefined;
  if (previewData) {
    const { fields: _fields, ...previewDataExtras } = previewData;
    const fields = sanitizeFieldValueRecord(
      previewData.fields as Record<string, unknown> | undefined,
    );
    const sanitizedPreviewData =
      fields || Object.keys(previewDataExtras).length
        ? { ...previewDataExtras, ...(fields ? { fields } : {}) }
        : undefined;
    if (sanitizedPreviewData) nextConfig.previewData = sanitizedPreviewData;
    else delete nextConfig.previewData;
  }
  return {
    ...definition,
    root,
    ...(Object.keys(nextConfig).length ? { config: nextConfig as NodeDefinition['config'] } : {}),
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
