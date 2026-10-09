import type { FieldValue, FlatDocument, FlatNode } from '@facadeur/core';
import { childOverridePath, mergeChildFieldContext } from '@facadeur/core';
import {
  resolveInstanceFieldScope,
  resolveDocumentFieldScope,
  resolveTargetDocument,
  MAX_NESTED_DEPTH,
} from './resolve';
import type { VirtualLayerItem, VirtualLayerOptions } from './types';
export function virtualLayerTree(
  document: FlatDocument,
  options: VirtualLayerOptions = {},
): VirtualLayerItem | null {
  const root = document.nodes[document.rootId];
  if (!root) return null;
  const catalog = options.catalog ?? new Map<string, FlatDocument>();
  const schemaCatalog = options.schemaCatalog;
  return layerItem({
    document,
    node: root,
    address: root.id,
    virtual: false,
    ownerNodeId: undefined,
    instancePath: [],
    catalog,
    schemaCatalog,
    scope: resolveDocumentFieldScope(document, catalog, schemaCatalog),
    childFields: undefined,
    childFieldPath: null,
    depth: 0,
    stack: new Set([document.id]),
    prepareDocument: options.prepareDocument,
  });
}

function layerItem(input: {
  document: FlatDocument;
  node: FlatNode;
  address: string;
  virtual: boolean;
  ownerNodeId: string | undefined;
  instancePath: string[];
  catalog: ReadonlyMap<string, FlatDocument>;
  schemaCatalog?: VirtualLayerOptions['schemaCatalog'];
  scope: Record<string, FieldValue>;
  childFields?: Record<string, Record<string, FieldValue>>;
  childFieldPath?: string | null;
  depth: number;
  stack: Set<string>;
  prepareDocument?: (document: FlatDocument, variant?: string) => FlatDocument;
}): VirtualLayerItem {
  const { document, node, address, virtual, ownerNodeId, instancePath, catalog } = input;
  const children: VirtualLayerItem[] = [];
  const addChild = (
    child: FlatNode,
    childAddress: string,
    childOwner: string | undefined,
    path: string[],
  ) =>
    children.push(
      layerItem({
        ...input,
        node: child,
        address: childAddress,
        virtual: virtual || Boolean(childOwner),
        ownerNodeId: childOwner,
        instancePath: path,
        depth: input.depth + 1,
        prepareDocument: input.prepareDocument,
      }),
    );

  if ('children' in node) {
    for (const id of node.children) {
      const child = document.nodes[id];
      if (child) {
        addChild(
          child,
          joinAddress(address, child.id, document.kind === 'page' && node.id === document.rootId),
          ownerNodeId,
          instancePath,
        );
      }
    }
  }

  if (node.type === 'instance' && input.depth < MAX_NESTED_DEPTH) {
    const rawTarget = catalog.get(node.component);
    const overridePath = childOverridePath(input.childFieldPath, node.id);
    const childOverride = overridePath ? input.childFields?.[overridePath] : undefined;
    const effectiveNode = childOverride
      ? { ...node, fields: { ...(node.fields ?? {}), ...childOverride } }
      : node;
    const target = rawTarget
      ? resolveTargetDocument(rawTarget, effectiveNode, input.scope, input.prepareDocument)
      : null;
    const targetRoot = target?.nodes[target.rootId] ?? null;
    if (target && targetRoot && 'children' in targetRoot && !input.stack.has(target.id)) {
      const scope = resolveInstanceFieldScope(
        node,
        target,
        input.scope,
        catalog,
        effectiveNode.fields,
        input.schemaCatalog,
      );
      const stack = new Set(input.stack).add(target.id);
      for (const id of targetRoot.children) {
        const child = target.nodes[id];
        if (!child) continue;
        const nextOwner = ownerNodeId ?? node.id;
        const nextPath = ownerNodeId ? [...instancePath, node.id] : instancePath;
        children.push(
          layerItem({
            document: target,
            node: child,
            address: joinAddress(address, child.id),
            virtual: true,
            ownerNodeId: nextOwner,
            instancePath: nextPath,
            catalog,
            schemaCatalog: input.schemaCatalog,
            scope,
            childFields: mergeChildFieldContext(input.childFields, node.childFields, overridePath),
            childFieldPath: overridePath ?? '',
            depth: input.depth + 1,
            stack,
            prepareDocument: input.prepareDocument,
          }),
        );
      }
    }
  }

  return {
    id: node.id,
    address,
    documentId: document.id,
    name: node.id === document.rootId ? 'root' : layerName(node),
    tagName: tagNameForNode(node),
    type:
      node.type === 'frame' || node.type === 'text' || node.type === 'image' ? 'layer' : node.type,
    children,
    virtual,
    ...(ownerNodeId ? { ownerNodeId } : {}),
    ...(virtual ? { instancePath: instancePath.join('/') } : {}),
    fieldEditable: node.type === 'instance' && (virtual || !ownerNodeId),
  };
}

function tagNameForNode(node: FlatNode): string | undefined {
  if (node.type === 'repeater' || node.type === 'switch' || node.type === 'instance')
    return undefined;
  if (node.tag) return node.tag;
  if (node.type === 'text') return 'span';
  if (node.type === 'image') return 'img';
  return 'div';
}

function joinAddress(parent: string, id: string, omitParent = false): string {
  return omitParent || !parent ? id : `${parent}/${id}`;
}

function layerName(node: FlatNode): string {
  if (node.name) return node.name;
  if (node.type === 'instance') return node.component;
  if (node.type === 'text' && node.text) {
    const trimmed = node.text.trim();
    if (trimmed) return trimmed.length > 42 ? `${trimmed.slice(0, 42)}…` : trimmed;
  }
  return node.id;
}
