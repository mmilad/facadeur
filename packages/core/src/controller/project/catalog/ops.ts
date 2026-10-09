import type {
  CatalogMapKey,
  JsonSchemaObject,
  Node,
  NodeDefinition,
  ProjectCatalog,
} from '@facadeur/domain';

const LEAF_TAGS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);

function nodeAcceptsChildren(tagName: string): boolean {
  return !LEAF_TAGS.has(tagName.toLowerCase());
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
    const next = { ...(node.data ?? {}) } as Record<string, unknown>;
    if (value === null || value === undefined || value === '') {
      delete next[field];
    } else {
      next[field] = value;
    }
    if (Object.keys(next).length > 0) {
      (node as { data?: Record<string, unknown> }).data = next;
    } else {
      delete (node as { data?: Record<string, unknown> }).data;
    }
  });
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

export function patchNodeStyleRecord(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  record: Readonly<Record<string, string>>,
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    const next = { ...record };
    if (Object.keys(next).length) (node as { style?: Record<string, string> }).style = next;
    else delete (node as { style?: Record<string, string> }).style;
  });
}

export function patchNodeDomAttributes(
  catalog: ProjectCatalog,
  definitionUuid: string,
  nodeUuid: string,
  attributes: Readonly<Record<string, string>>,
): ProjectCatalog {
  return mutateNode(catalog, definitionUuid, nodeUuid, (node) => {
    const merged = { ...(node.dom.attributes ?? {}), ...attributes };
    for (const [key, value] of Object.entries(attributes)) {
      if (!value) delete merged[key];
    }
    (node.dom as { attributes?: Record<string, string> }).attributes =
      Object.keys(merged).length > 0 ? merged : undefined;
  });
}

export function classListFromNode(node: Node): string[] {
  const raw = node.dom.attributes?.class ?? '';
  return raw.split(/\s+/).filter(Boolean);
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
    (node.dom as { tagName: string }).tagName = trimmed;
    if (!nodeAcceptsChildren(trimmed)) {
      delete (node.dom as { children?: Node[] }).children;
    } else if (!node.dom.children) {
      (node.dom as { children?: Node[] }).children = [];
    }
  });
}

export function resolveJsonSchemaForDefinition(
  catalog: ProjectCatalog,
  definition: NodeDefinition,
): JsonSchemaObject | null {
  if (definition.schema.kind === 'inline') return definition.schema.schema;
  const id = definition.schema.uuid;
  return id ? (catalog.schemas?.[id] ?? null) : null;
}
