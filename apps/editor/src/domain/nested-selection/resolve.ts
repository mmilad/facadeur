import type { FieldValue, FlatDocument, FlatNode, SchemaCatalog } from '@facadeur/core';
import {
  childOverridePath,
  mergeChildFieldContext,
  resolveVariantDocument,
  selectStructuralChild,
  structuralChildSchemas,
  toFlat,
  toNested,
} from '@facadeur/core';
import type { NestedSelection } from './types';
import { publicFieldsFor } from '../schema/component-contract';

export const MAX_NESTED_DEPTH = 32;
export function resolveNestedSelection(
  document: FlatDocument,
  renderedId: string,
  catalog: ReadonlyMap<string, FlatDocument>,
  paintRoot: boolean,
  prepareDocument?: (document: FlatDocument, variant?: string) => FlatDocument,
  schemaCatalog?: SchemaCatalog,
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
    schemaCatalog,
    scope: resolveDocumentFieldScope(preparedDocument, catalog, schemaCatalog),
    prepareDocument,
  });
}

interface WalkInput {
  document: FlatDocument;
  node: FlatNode;
  documentIndex: number;
  parts: readonly string[];
  catalog: ReadonlyMap<string, FlatDocument>;
  schemaCatalog?: SchemaCatalog;
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
      const inheritedFields = resolveInstanceFieldScope(
        node,
        target,
        input.scope,
        input.catalog,
        undefined,
        input.schemaCatalog,
      );
      const resolvedFields = resolveInstanceFieldScope(
        node,
        target,
        input.scope,
        input.catalog,
        effectiveNode.fields,
        input.schemaCatalog,
      );
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
    if (!targetRoot || !('children' in targetRoot)) return null;
    const ownerNodeId = input.ownerNodeId ?? node.id;
    const inheritedScope = target
      ? resolveInstanceFieldScope(
          node,
          target,
          input.scope,
          input.catalog,
          undefined,
          input.schemaCatalog,
        )
      : {};
    const resolvedScope = target
      ? resolveInstanceFieldScope(
          node,
          target,
          input.scope,
          input.catalog,
          effectiveNode.fields,
          input.schemaCatalog,
        )
      : {};
    const scope = preserveStructuralAliases(resolvedScope, input.scope);
    if (targetRoot.type === 'repeater' || targetRoot.type === 'switch') {
      if (parts[nextIndex] !== targetRoot.id) return null;
      return walkRenderedNode({
        ...input,
        document: target,
        node: targetRoot,
        documentIndex: nextIndex,
        ownerNodeId,
        containingInstance: node,
        renderId: `${input.renderId}/${targetRoot.id}`,
        depth: input.depth + 1,
        scope,
        inheritedFields: preserveStructuralAliases(inheritedScope, input.scope),
        childFields: mergeChildFieldContext(input.childFields, node.childFields, overridePath),
        childFieldPath: overridePath ?? '',
      });
    }
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
      inheritedFields: preserveStructuralAliases(inheritedScope, input.scope),
    });
  }

  if (!('children' in node)) return null;
  let childIndex = nextIndex;
  let scope = input.scope;
  let renderPrefix = input.renderId;
  if (node.type === 'repeater') {
    const indexPart = parts[childIndex];
    if (!indexPart || !/^\d+$/.test(indexPart)) return null;
    const items = input.scope.items;
    const item = Array.isArray(items) ? items[Number(indexPart)] : undefined;
    if (item === undefined) return null;
    const candidates = structuralChildSchemas(input.document, node.id, {
      documents: input.catalog,
      ...(input.schemaCatalog ? { schemaCatalog: input.schemaCatalog } : {}),
    });
    const selection = selectStructuralChild(item, candidates);
    const selected = selection ? candidates[selection.index] : undefined;
    if (!selection || !selected) return null;
    scope = structuralItemScope(
      input.scope,
      item,
      Number(indexPart),
      selection.props,
      selection.legacy,
    );
    renderPrefix += `/${indexPart}`;
    childIndex += 1;
    const directChild = input.document.nodes[selected.path[0] ?? ''];
    if (selected.path.length === 1 && directChild?.type === 'instance') {
      return walkRenderedNode({
        ...input,
        node: selected.node,
        documentIndex: childIndex,
        instancePath: input.ownerNodeId
          ? [...input.instancePath, selected.node.id]
          : input.instancePath,
        containingInstance: selected.node,
        renderId: `${renderPrefix}/${selected.node.id}`,
        depth: input.depth + 1,
        scope,
      });
    }
  } else if (node.type === 'switch') {
    const props = input.scope.props;
    if (props === undefined) return null;
    const candidates = structuralChildSchemas(input.document, node.id, {
      documents: input.catalog,
      ...(input.schemaCatalog ? { schemaCatalog: input.schemaCatalog } : {}),
    });
    const selection = selectStructuralChild(props, candidates);
    const selected = selection ? candidates[selection.index] : undefined;
    if (!selection || !selected || selected.path.length !== 1) return null;
    scope = structuralSwitchScope(input.scope, selection.props, selection.legacy);
    return walkRenderedNode({
      ...input,
      node: selected.node,
      documentIndex: childIndex,
      instancePath: input.ownerNodeId
        ? [...input.instancePath, selected.node.id]
        : input.instancePath,
      containingInstance: selected.node,
      renderId: `${input.renderId}/${selected.node.id}`,
      depth: input.depth + 1,
      scope,
    });
  }
  const nextId = parts[childIndex];
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
    documentIndex: childIndex,
    instancePath: nextPath,
    containingInstance: input.containingInstance,
    renderId: `${renderPrefix}/${child.id}`,
    scope,
  });
}

function structuralItemScope(
  scope: Record<string, FieldValue>,
  item: FieldValue,
  index: number,
  props: FieldValue,
  legacy: boolean,
) {
  const parent = repeatParent(scope);
  const result: Record<string, FieldValue> = {
    ...scope,
    ...(legacy && isRecord(props) ? props : {}),
    item,
    index,
    props,
    ...(parent ? { parent } : {}),
  };
  if (!parent) delete result.parent;
  return result;
}

function structuralSwitchScope(
  scope: Record<string, FieldValue>,
  props: FieldValue,
  legacy: boolean,
) {
  return {
    ...scope,
    ...(legacy && isRecord(props) ? props : {}),
    props,
  };
}

function repeatParent(scope: Record<string, FieldValue>) {
  if (scope.item === undefined && scope.index === undefined) return undefined;
  return {
    ...(scope.item !== undefined ? { item: structuredClone(scope.item) } : {}),
    ...(scope.index !== undefined ? { index: structuredClone(scope.index) } : {}),
    ...(scope.parent !== undefined ? { parent: structuredClone(scope.parent) } : {}),
  };
}

function preserveStructuralAliases(
  resolved: Record<string, FieldValue>,
  inherited: Record<string, FieldValue>,
) {
  const scope = { ...resolved };
  for (const name of ['item', 'index', 'parent', 'props'] as const) {
    if (Object.hasOwn(inherited, name)) scope[name] = structuredClone(inherited[name]!);
  }
  return scope;
}

function isRecord(value: FieldValue): value is Record<string, FieldValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

/** Local document defaults seed editor preview scope while public fields define the contract. */
export function resolveDocumentFieldScope(
  document: FlatDocument,
  catalog: ReadonlyMap<string, FlatDocument>,
  schemaCatalog?: SchemaCatalog,
): Record<string, FieldValue> {
  const localDefaults: Record<string, FieldValue> = {};
  for (const field of document.fields ?? []) {
    if (field.default !== undefined) localDefaults[field.name] = field.default;
  }
  return resolveFields(publicFieldsFor(document, catalog, schemaCatalog), localDefaults);
}

export function resolveInstanceFieldScope(
  instance: Extract<FlatNode, { type: 'instance' }>,
  target: FlatDocument,
  parentScope: Record<string, FieldValue>,
  catalog: ReadonlyMap<string, FlatDocument>,
  localFields: Record<string, FieldValue> | undefined = instance.fields,
  schemaCatalog?: SchemaCatalog,
): Record<string, FieldValue> {
  const fields = publicFieldsFor(target, catalog, schemaCatalog);
  const inherited: Record<string, FieldValue> = {};
  if (instance.forwardFields !== false) {
    for (const field of fields) {
      if (Object.hasOwn(parentScope, field.name))
        inherited[field.name] = structuredClone(parentScope[field.name]!);
    }
  }
  return resolveFields(fields, {
    ...inherited,
    ...resolveFieldBindings(instance.fieldBindings, parentScope),
    ...(localFields ?? {}),
  });
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
