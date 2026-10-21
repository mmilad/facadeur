import type {
  CatalogMapKey,
  CompositionSource,
  FieldValue,
  FieldExposure,
  JsonSchemaObject,
  Node,
  NodeConfig,
  NodeDefinition,
  ProjectCatalog,
  RepeaterFilter,
  StaticFieldConfig,
} from '@facadeur/domain';
import { isVoidHtmlTag } from '../../../document/html-tags';
import { layerSelectorForName } from './node-classes';

export { classListFromNode } from './node-classes';

function nodeAcceptsChildren(tagName: string): boolean {
  return !isVoidHtmlTag(tagName);
}

export function findDefinition(
  catalog: ProjectCatalog,
  uuid: string,
): { kind: CatalogMapKey; definition: NodeDefinition } | null {
  if (catalog.atoms[uuid]) return { kind: 'atoms', definition: catalog.atoms[uuid]! };
  if (catalog.components[uuid])
    return { kind: 'components', definition: catalog.components[uuid]! };
  if (catalog.pages[uuid]) return { kind: 'pages', definition: catalog.pages[uuid]! };
  return null;
}

export function listCatalogDefinitions(
  catalog: ProjectCatalog,
): { kind: CatalogMapKey; definition: NodeDefinition }[] {
  return [
    ...Object.values(catalog.atoms).map((definition) => ({ kind: 'atoms' as const, definition })),
    ...Object.values(catalog.components).map((definition) => ({
      kind: 'components' as const,
      definition,
    })),
    ...Object.values(catalog.pages).map((definition) => ({ kind: 'pages' as const, definition })),
  ];
}

export function findNodeByUuid(root: Node, uuid: string): Node | null {
  if (root.uuid === uuid) return root;
  for (const child of root.dom.children ?? []) {
    const found = findNodeByUuid(child, uuid);
    if (found) return found;
  }
  return null;
}

function mutateNode(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  mutate: (node: Node) => void,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]! as NodeDefinition;
  const visit = (node: Node): boolean => {
    if (node.uuid === nodeUuid) {
      mutate(node);
      return true;
    }
    for (const child of node.dom.children ?? []) {
      if (visit(child)) return true;
    }
    return false;
  };
  if (!visit(definition.root)) return catalog;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = definition;
  return next;
}

export function patchNodeData(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  field: string,
  value: unknown,
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    const next = patchRecordPath(
      node.data as Record<string, unknown> | undefined,
      field,
      value,
      value === null || value === undefined || value === '',
    );
    if (Object.keys(next).length > 0) {
      (node as { data?: Record<string, unknown> }).data = next;
    } else {
      delete (node as { data?: Record<string, unknown> }).data;
    }
  });
}

/** Keep field-backed values in sync when an inline schema removes properties. */
export function pruneDefinitionValuesForSchema(
  catalog: ProjectCatalog,
  definitionUuid: string,
  schema: JsonSchemaObject,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const definition = located.definition;
  if (definition.schema.kind !== 'inline') return catalog;
  const nextProperties = schema.properties ?? {};
  const removedNames = new Set(
    Object.keys(definition.schema.schema.properties ?? {}).filter(
      (name) => !Object.prototype.hasOwnProperty.call(nextProperties, name),
    ),
  );
  if (!removedNames.size) return catalog;
  const next = structuredClone(catalog) as ProjectCatalog;
  const nextDefinition = next[located.kind][definitionUuid]!;
  const pruneRecord = (record: Record<string, unknown> | undefined) => {
    if (!record) return undefined;
    const pruned = { ...record };
    for (const name of removedNames) delete pruned[name];
    return Object.keys(pruned).length ? pruned : undefined;
  };
  const config = { ...nextDefinition.config };
  const previewData = config.previewData;
  if (previewData) {
    const fields = pruneRecord(previewData.fields);
    const { fields: _fields, ...extras } = previewData;
    const nextPreviewData =
      fields || Object.keys(extras).length
        ? { ...extras, ...(fields ? { fields: fields as Record<string, FieldValue> } : {}) }
        : undefined;
    if (nextPreviewData) config.previewData = nextPreviewData;
    else delete config.previewData;
  }
  const { config: _oldConfig, ...definitionBase } = nextDefinition;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = {
    ...definitionBase,
    ...(Object.keys(config).length ? { config } : {}),
  };
  return next;
}

export function patchCatalogDefinitionPreviewField(
  catalog: ProjectCatalog,
  definitionUuid: string,
  field: string,
  value: unknown,
  emptyStringRemoves = false,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]!;
  const previewData = definition.config?.previewData ?? {};
  const fields = patchRecordPath(
    previewData.fields as Record<string, unknown> | undefined,
    field,
    value,
    value === null || value === undefined || (emptyStringRemoves && value === ''),
  );
  const nextPreviewData = { ...previewData };
  if (Object.keys(fields).length) nextPreviewData.fields = fields as Record<string, FieldValue>;
  else delete nextPreviewData.fields;
  const nextConfig = { ...definition.config };
  if (Object.keys(nextPreviewData).length) nextConfig.previewData = nextPreviewData;
  else delete nextConfig.previewData;
  const nextDefinition = { ...definition };
  if (Object.keys(nextConfig).length) nextDefinition.config = nextConfig;
  else delete (nextDefinition as { config?: NodeDefinition['config'] }).config;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = nextDefinition;
  return next;
}

function patchRecordPath(
  record: Readonly<Record<string, unknown>> | undefined,
  path: string,
  value: unknown,
  removeValue: boolean,
): Record<string, unknown> {
  const segments = path.split('.').filter(Boolean);
  if (!segments.length) return { ...(record ?? {}) };
  const [segment, ...remaining] = segments;
  const next = { ...(record ?? {}) };
  if (!remaining.length) {
    if (removeValue) delete next[segment!];
    else next[segment!] = value;
    return next;
  }
  const current = next[segment!];
  const nested =
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  const updated = patchRecordPath(nested, remaining.join('.'), value, removeValue);
  if (removeValue && Object.keys(updated).length === 0) delete next[segment!];
  else next[segment!] = updated;
  return next;
}

export function patchNodeDataRecord(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  record: Readonly<Record<string, unknown>>,
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    (node as { data?: Record<string, unknown> }).data = { ...record };
  });
}

export function patchNodeComposition(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  patch: {
    readonly source?: CompositionSource | null;
    readonly indexName?: string | null;
    readonly keyPath?: string | null;
    readonly filter?: RepeaterFilter | null;
    readonly compositionCase?: string | null;
    readonly definitionRefBinding?: NodeConfig['definitionRefBinding'] | null;
  },
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    const config = { ...(node.config ?? {}) };
    if (
      config.composition &&
      config.composition.kind !== 'slot' &&
      (Object.hasOwn(patch, 'source') ||
        Object.hasOwn(patch, 'indexName') ||
        Object.hasOwn(patch, 'keyPath') ||
        Object.hasOwn(patch, 'filter'))
    ) {
      const composition = { ...config.composition };
      if (Object.hasOwn(patch, 'source')) {
        if (patch.source) composition.source = patch.source;
        else delete composition.source;
        if (composition.kind === 'repeater') {
          delete composition.filter;
          delete composition.keyPath;
        }
      }
      if (composition.kind === 'repeater' && Object.hasOwn(patch, 'indexName')) {
        if (patch.indexName?.trim()) composition.indexName = patch.indexName.trim();
        else delete composition.indexName;
      }
      if (composition.kind === 'repeater' && Object.hasOwn(patch, 'keyPath')) {
        if (patch.keyPath?.trim()) composition.keyPath = patch.keyPath.trim();
        else delete composition.keyPath;
      }
      if (composition.kind === 'repeater' && Object.hasOwn(patch, 'filter')) {
        if (patch.filter) composition.filter = patch.filter;
        else delete composition.filter;
      }
      config.composition = composition;
      if (composition.kind === 'repeater') delete (node.dom as { tagName?: string }).tagName;
    }
    if (Object.hasOwn(patch, 'compositionCase')) {
      if (patch.compositionCase) config.compositionCase = patch.compositionCase;
      else delete config.compositionCase;
    }
    if (Object.hasOwn(patch, 'definitionRefBinding')) {
      if (patch.definitionRefBinding) {
        config.definitionRefBinding = patch.definitionRefBinding;
        delete config.definitionRef;
      } else delete config.definitionRefBinding;
    }
    (node as { config?: NodeConfig }).config = Object.keys(config).length > 0 ? config : undefined;
  });
}

export function patchNodeDomAttributes(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  attributes: Readonly<Record<string, string>>,
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    const sanitizedAttributes = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => key !== 'class'),
    );
    const merged = { ...(node.dom.attributes ?? {}), ...sanitizedAttributes };
    for (const [key, value] of Object.entries(sanitizedAttributes)) {
      if (!value) delete merged[key];
    }
    (node.dom as { attributes?: Record<string, string> }).attributes =
      Object.keys(merged).length > 0 ? merged : undefined;
  });
}

export function patchNodeDomText(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  text: string,
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    if (text) (node.dom as { text?: string }).text = text;
    else delete (node.dom as { text?: string }).text;
  });
}

export function patchNodeTagName(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  tagName: string,
): ProjectCatalog {
  const trimmed = tagName.trim();
  if (!trimmed) return catalog;
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    if (node.config?.composition?.kind === 'repeater') return;
    (node.dom as { tagName: string }).tagName = trimmed;
    if (!nodeAcceptsChildren(trimmed)) {
      delete (node.dom as { children?: Node[] }).children;
    } else if (!node.dom.children) {
      (node.dom as { children?: Node[] }).children = [];
    }
  });
}

export function patchNodeName(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  name: string,
): ProjectCatalog {
  const trimmed = name.trim();
  if (!trimmed) return catalog;
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    (node as { name?: string }).name = trimmed;
    const classes = [...(node.classes ?? [])];
    const generatedIndex = classes.findIndex((item) => item.generated);
    if (generatedIndex >= 0) {
      classes[generatedIndex] = {
        ...classes[generatedIndex]!,
        name: layerSelectorForName(trimmed).slice(1),
      };
      (node as { classes?: typeof classes }).classes = classes;
    }
  });
}

export function patchDefinitionFieldExposure(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  fieldExposure: FieldExposure,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]!;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = {
    ...definition,
    config: {
      ...definition.config,
      fieldExposure: {
        ...definition.config?.fieldExposure,
        [nodeUuid]: fieldExposure,
      },
    },
  };
  return next;
}

export function patchDefinitionStaticField(
  catalog: ProjectCatalog,
  definitionUuid: string,
  fieldName: string,
  config: StaticFieldConfig | undefined,
  clearPreviewValue = false,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]!;
  const staticFields = { ...definition.config?.staticFields };
  if (config) staticFields[fieldName] = config;
  else delete staticFields[fieldName];

  const previewData = previewDataAfterFieldChange(definition, fieldName, clearPreviewValue);
  const nextConfig = { ...definition.config };
  if (Object.keys(staticFields).length) nextConfig.staticFields = staticFields;
  else delete nextConfig.staticFields;
  if (previewData) nextConfig.previewData = previewData;
  else delete nextConfig.previewData;
  const nextDefinition = { ...definition };
  if (Object.keys(nextConfig).length) nextDefinition.config = nextConfig;
  else delete (nextDefinition as { config?: NodeDefinition['config'] }).config;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = nextDefinition;
  return next;
}

export function patchDefinitionInstanceField(
  catalog: ProjectCatalog,
  definitionUuid: string,
  instanceUuid: string,
  fieldName: string,
  config: StaticFieldConfig | undefined,
  clearPreviewValue = false,
): ProjectCatalog {
  const located = findDefinition(catalog, definitionUuid);
  if (!located) return catalog;
  const next = structuredClone(catalog) as ProjectCatalog;
  const definition = next[located.kind][definitionUuid]!;
  const instanceFields = { ...definition.config?.instanceFieldConfigs?.[instanceUuid] };
  if (config) instanceFields[fieldName] = config;
  else delete instanceFields[fieldName];
  const instanceFieldConfigs = { ...definition.config?.instanceFieldConfigs };
  if (Object.keys(instanceFields).length) instanceFieldConfigs[instanceUuid] = instanceFields;
  else delete instanceFieldConfigs[instanceUuid];

  const previewData = previewDataAfterFieldChange(definition, fieldName, clearPreviewValue);
  const nextConfig = { ...definition.config };
  if (Object.keys(instanceFieldConfigs).length)
    nextConfig.instanceFieldConfigs = instanceFieldConfigs;
  else delete nextConfig.instanceFieldConfigs;
  if (previewData) nextConfig.previewData = previewData;
  else delete nextConfig.previewData;
  const nextDefinition = { ...definition };
  if (Object.keys(nextConfig).length) nextDefinition.config = nextConfig;
  else delete (nextDefinition as { config?: NodeDefinition['config'] }).config;
  (next[located.kind] as Record<string, NodeDefinition>)[definitionUuid] = nextDefinition;
  return next;
}

function previewDataAfterFieldChange(
  definition: NodeDefinition,
  fieldName: string,
  clearPreviewValue: boolean,
) {
  const previewData = definition.config?.previewData;
  if (!previewData || !clearPreviewValue) return previewData;
  const { fields: _fields, ...extras } = previewData;
  const fields = { ...previewData.fields };
  delete fields[fieldName];
  if (Object.keys(fields).length === 0 && Object.keys(extras).length === 0) return undefined;
  return { ...extras, ...(Object.keys(fields).length ? { fields } : {}) };
}

export function resolveJsonSchemaForDefinition(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
): JsonSchemaObject | null {
  if (definition.schema.kind === 'inline') return definition.schema.schema;
  const id = definition.schema.uuid;
  return id ? (catalog.schemas?.[id] ?? null) : null;
}
