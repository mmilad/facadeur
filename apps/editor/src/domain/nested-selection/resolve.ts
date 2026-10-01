import type { FieldValue, FlatDocument, FlatNode } from '@facadeur/core';
import {
  childOverridePath,
  mergeChildFieldContext,
  resolveVariantDocument,
  toFlat,
  toNested,
} from '@facadeur/core';
import type { NestedSelection } from './types.js';

export const MAX_NESTED_DEPTH = 32;
export function resolveNestedSelection(
  document: FlatDocument,
  renderedId: string,
  catalog: ReadonlyMap<string, FlatDocument>,
  paintRoot: boolean,
  prepareDocument?: (document: FlatDocument, variant?: string) => FlatDocument,
): NestedSelection | null {
  const parts = renderedId.split('/').filter(Boolean);
  if (!parts.length) return null;
  const root = document.nodes[document.rootId];
  if (!root) return null;
  const preparedDocument = prepareDocument?.(document) ?? document;
  const preparedRoot = preparedDocument.nodes[preparedDocument.rootId];
  if (!preparedRoot) return null;
  const start = preparedRoot.type !== 'frame' || paintRoot ? preparedRoot : undefined;
  const firstId = parts[0] ?? '';
  const first: FlatNode | undefined = start
    ? start.id === firstId
      ? start
      : undefined
    : preparedDocument.nodes[firstId];
  if (!first) return null;
  return walkRenderedNode({
    document: preparedDocument,
    node: first,
    documentIndex: 0,
    parts,
    catalog,
    ownerNodeId: null,
    instancePath: [],
    renderId: first.id,
    depth: 0,
    scope: resolveFields(preparedDocument.fields, undefined),
    prepareDocument,
  });
}

interface WalkInput {
  document: FlatDocument;
  node: FlatNode;
  documentIndex: number;
  parts: readonly string[];
  catalog: ReadonlyMap<string, FlatDocument>;
  ownerNodeId: string | null;
  instancePath: readonly string[];
  containingInstance?: Extract<FlatNode, { type: 'instance' }>;
  scope: Record<string, FieldValue>;
  inheritedFields?: Record<string, FieldValue>;
  childFields?: Record<string, Record<string, FieldValue>>;
  childFieldPath?: string | null;
  renderId: string;
  depth: number;
  prepareDocument?: (document: FlatDocument, variant?: string) => FlatDocument;
}

function walkRenderedNode(input: WalkInput): NestedSelection | null {
  const { node, parts, documentIndex } = input;
  if (parts[documentIndex] !== node.id || input.depth > MAX_NESTED_DEPTH) return null;
  const nextIndex = documentIndex + 1;
  if (nextIndex >= parts.length) {
    if (node.type === 'instance') {
      const rawTarget = input.catalog.get(node.component);
      const overridePath = childOverridePath(input.childFieldPath, node.id);
      const childOverride = overridePath ? input.childFields?.[overridePath] : undefined;
      const effectiveNode = childOverride
        ? { ...node, fields: { ...(node.fields ?? {}), ...childOverride } }
        : node;
      const target = rawTarget
        ? resolveTargetDocument(rawTarget, effectiveNode, input.scope, input.prepareDocument)
        : null;
      if (!target) return null;
      const inheritedFields = resolveFields(target.fields, {
        ...(node.fields ?? {}),
        ...resolveFieldBindings(node.fieldBindings, input.scope),
      });
      const resolvedFields = resolveFields(target.fields, {
        ...(effectiveNode.fields ?? {}),
        ...resolveFieldBindings(node.fieldBindings, input.scope),
      });
      return input.ownerNodeId
        ? {
            ownerNodeId: input.ownerNodeId,
            instancePath: input.instancePath.join('/'),
            renderId: input.renderId,
            node,
            document: input.document,
            target,
            ...(input.containingInstance ? { containingInstance: input.containingInstance } : {}),
            resolvedFields,
            inheritedFields,
          }
        : null;
    }
    return input.ownerNodeId
      ? {
          ownerNodeId: input.ownerNodeId,
          instancePath: input.instancePath.join('/'),
          renderId: input.renderId,
          node,
          document: input.document,
          target: input.document,
          ...(input.containingInstance ? { containingInstance: input.containingInstance } : {}),
          resolvedFields: input.scope,
          ...(input.inheritedFields ? { inheritedFields: input.inheritedFields } : {}),
        }
      : null;
  }

  if (node.type === 'instance') {
    const rawTarget = input.catalog.get(node.component);
    const overridePath = childOverridePath(input.childFieldPath, node.id);
    const childOverride = overridePath ? input.childFields?.[overridePath] : undefined;
    const effectiveNode = childOverride
      ? { ...node, fields: { ...(node.fields ?? {}), ...childOverride } }
      : node;
    const target = rawTarget
      ? resolveTargetDocument(rawTarget, effectiveNode, input.scope, input.prepareDocument)
      : null;
    const targetRoot = target && target.nodes[target.rootId];
    if (!targetRoot || targetRoot.type !== 'frame') return null;
    const ownerNodeId = input.ownerNodeId ?? node.id;
    const inheritedScope = resolveFields(target?.fields, {
      ...(node.fields ?? {}),
      ...resolveFieldBindings(node.fieldBindings, input.scope),
    });
    const scope = resolveFields(target?.fields, {
      ...(effectiveNode.fields ?? {}),
      ...resolveFieldBindings(node.fieldBindings, input.scope),
    });
    const nextId = parts[nextIndex];
    const child = targetRoot.children
      .map((id) => target.nodes[id])
      .find((candidate) => candidate?.id === nextId);
    if (!child) return null;
    const nextPath = ownerNodeId
      ? child?.type === 'instance'
        ? [...input.instancePath, child.id]
        : input.instancePath
      : input.instancePath;
    return walkRenderedNode({
      ...input,
      document: target,
      node: child,
      documentIndex: nextIndex,
      ownerNodeId,
      instancePath: nextPath,
      containingInstance: child.type === 'instance' ? child : node,
      renderId: `${input.renderId}/${child.id}`,
      depth: input.depth + 1,
      scope,
      childFields: mergeChildFieldContext(input.childFields, node.childFields, overridePath),
      childFieldPath: overridePath ?? '',
      inheritedFields: inheritedScope,
    });
  }

  if (node.type !== 'frame') return null;
  const nextId = parts[nextIndex];
  const child = node.children
    .map((id) => input.document.nodes[id])
    .find((candidate) => candidate?.id === nextId);
  if (!child) return null;
  const nextPath = input.ownerNodeId
    ? child.type === 'instance'
      ? [...input.instancePath, child.id]
      : input.instancePath
    : input.instancePath;
  return walkRenderedNode({
    ...input,
    node: child,
    documentIndex: nextIndex,
    instancePath: nextPath,
    containingInstance: input.containingInstance,
    renderId: `${input.renderId}/${child.id}`,
  });
}

export function resolveTargetDocument(
  target: FlatDocument,
  instance: Extract<FlatNode, { type: 'instance' }>,
  scope: Record<string, FieldValue>,
  prepareDocument?: (document: FlatDocument, variant?: string) => FlatDocument,
): FlatDocument {
  const variant =
    instance.variants?.variant ??
    instance.variantRules?.find((rule) => matchesDisplay(rule.when, scope))?.variant;
  const resolved = variant ? toFlat(resolveVariantDocument(toNested(target), variant)) : target;
  return prepareDocument?.(resolved, variant) ?? resolved;
}

export function resolveFields(
  fields: readonly { name: string; default?: FieldValue }[] | undefined,
  overrides: Record<string, FieldValue> | undefined,
): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const field of fields ?? []) {
    if (field.default !== undefined) values[field.name] = structuredClone(field.default);
  }
  Object.assign(values, overrides ?? {});
  return values;
}

export function resolveFieldBindings(
  bindings: Record<string, string> | undefined,
  scope: Record<string, FieldValue>,
): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const [field, path] of Object.entries(bindings ?? {})) {
    const value = resolvePath(scope, path);
    if (value !== undefined) values[field] = structuredClone(value);
  }
  return values;
}

function resolvePath(
  value: FieldValue | Record<string, FieldValue>,
  path: string,
): FieldValue | undefined {
  let current: FieldValue | undefined = value as FieldValue;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function matchesDisplay(
  condition: NonNullable<Extract<FlatNode, { type: 'frame' }>['displayOn']>,
  scope: Record<string, FieldValue>,
): boolean {
  const value = resolvePath(scope, condition.path);
  if ('truthy' in condition) return condition.truthy ? Boolean(value) : !value;
  if ('equals' in condition) return JSON.stringify(value) === JSON.stringify(condition.equals);
  return false;
}
