import type {
  DisplayOn,
  DocumentChange,
  DocumentFile,
  FieldDefinition,
  FieldValue,
  NestedNode,
} from '@facadeur/core';
import { isVariantAxis, resolveVariantDocument, variantPresets } from '@facadeur/core';
import type { RenderContext } from './types.js';

export const MAX_DEPTH = 32;

export function definitionForInstance(
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): DocumentFile | undefined {
  const base = ctx.catalog.get(node.component);
  if (!base) return undefined;
  const hasNamedVariants = variantPresets(base).some((variant) => variant.name !== 'default');
  const selected = hasNamedVariants ? selectedVariantForInstance(node, ctx) : undefined;
  const resolved = selected ? resolveVariantDocument(base, selected) : base;
  return ctx.prepareInstanceDocument?.(resolved, selected) ?? resolved;
}

export function selectedVariantForInstance(
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): string | undefined {
  if (node.variants?.variant !== undefined) return node.variants.variant;
  return node.variantRules?.find((rule) => matchesDisplay(rule.when, ctx.scope))?.variant;
}

export function resolveFields(
  fields: FieldDefinition[] | undefined,
  overrides: Record<string, FieldValue> | undefined,
): Record<string, FieldValue> {
  const resolved: Record<string, FieldValue> = {};
  for (const field of fields ?? []) {
    if (field.default !== undefined) resolved[field.name] = field.default;
  }
  for (const [name, value] of Object.entries(overrides ?? {})) resolved[name] = value;
  return resolved;
}

export function resolveVariants(
  document: DocumentFile,
  overrides: Record<string, string> | undefined,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  const hasNamedVariants = variantPresets(document).some((variant) => variant.name !== 'default');
  for (const axis of (document.variants ?? []).filter(isVariantAxis)) {
    const fallback = axis.default ?? axis.values[0];
    if (fallback !== undefined) resolved[axis.name] = fallback;
  }
  if (hasNamedVariants) resolved.variant = overrides?.variant ?? 'default';
  for (const [name, value] of Object.entries(overrides ?? {})) {
    if (name === 'variant' && !hasNamedVariants) continue;
    resolved[name] = value;
  }
  return resolved;
}

export function resolveInstance(
  renderedId: string,
  ctx: RenderContext,
): {
  instance: Extract<NestedNode, { type: 'instance' }>;
  path: string | null;
  scope: Record<string, FieldValue>;
  ownerId: string | null;
  depth: number;
} | null {
  const parts = renderedId.split('/');
  const rootId = parts[0];
  if (!rootId) return null;
  const canvasNode = findCanvasChild(ctx, rootId);
  if (!canvasNode) return null;
  return walkRendered(canvasNode, parts, 0, ctx, {
    path: null,
    scope: ctx.scope,
    ownerId: null,
    depth: 0,
  });
}

function walkRendered(
  node: NestedNode,
  parts: string[],
  index: number,
  ctx: RenderContext,
  parent: {
    path: string | null;
    scope: Record<string, FieldValue>;
    ownerId: string | null;
    depth: number;
  },
): {
  instance: Extract<NestedNode, { type: 'instance' }>;
  path: string | null;
  scope: Record<string, FieldValue>;
  ownerId: string | null;
  depth: number;
} | null {
  if (node.id !== parts[index]) return null;
  const last = index === parts.length - 1;
  if (node.type === 'instance') {
    if (last) return { instance: node, ...parent };
    const definition = definitionForInstance(node, ctx);
    if (!definition || definition.root.type !== 'frame') return null;
    const path = joinId(parent.path, node.id);
    const scope = resolveFields(definition.fields, {
      ...(node.fields ?? {}),
      ...resolveFieldBindings(node.fieldBindings, parent.scope),
    });
    const root = definition.root;
    const repeated = root.repeat ? repeatedItem(root.repeat, scope, parts[index + 1]) : undefined;
    const childIndex = root.repeat ? index + 2 : index + 1;
    const nextId = parts[childIndex];
    const child = (root.children ?? []).find((entry) => entry.id === nextId);
    if (!child || (root.repeat && !repeated)) return null;
    return walkRendered(child, parts, childIndex, ctx, {
      path: repeated ? joinId(path, repeated.key) : path,
      scope: repeated?.scope ?? scope,
      ownerId: path,
      depth: parent.depth + 1,
    });
  }
  if (node.type !== 'frame' || last) return null;
  const path = joinId(parent.path, node.id);
  const repeated = node.repeat
    ? repeatedItem(node.repeat, parent.scope, parts[index + 1])
    : undefined;
  const childIndex = node.repeat ? index + 2 : index + 1;
  const nextId = parts[childIndex];
  const child = (node.children ?? []).find((entry) => entry.id === nextId);
  if (!child || (node.repeat && !repeated)) return null;
  return walkRendered(child, parts, childIndex, ctx, {
    ...parent,
    path: repeated ? joinId(path, repeated.key) : path,
    scope: repeated?.scope ?? parent.scope,
  });
}

export function repeatedItem(
  repeat: NonNullable<Extract<NestedNode, { type: 'frame' }>['repeat']>,
  scope: Record<string, FieldValue>,
  segment: string | undefined,
): { key: string; scope: Record<string, FieldValue> } | undefined {
  if (segment === undefined) return undefined;
  const source = resolvePath(scope, repeat.path);
  if (!Array.isArray(source)) return undefined;
  const itemName = repeat.as ?? 'item';
  for (const [index, item] of source.entries()) {
    const rawKey = repeat.key ? resolvePath(item, repeat.key) : index;
    const key = repeatKeySegment(rawKey, index);
    if (key === segment) return { key, scope: { ...scope, [itemName]: item } };
  }
  return undefined;
}

export function findCanvasChild(ctx: RenderContext, id: string): NestedNode | undefined {
  const document = ctx.canvasDocument ?? (ctx.canvasId ? ctx.catalog.get(ctx.canvasId) : undefined);
  const documents = document ? [document] : [...ctx.catalog.values()];
  for (const entry of documents) {
    if (entry.root.id === id) return entry.root;
    if (entry.root.type !== 'frame') continue;
    const child = (entry.root.children ?? []).find((node) => node.id === id);
    if (child) return child;
  }
  return undefined;
}

export function tagFor(node: NestedNode, ctx: RenderContext): string {
  if (node.type !== 'instance') {
    return node.tag ?? (node.type === 'text' ? 'span' : node.type === 'image' ? 'img' : 'div');
  }
  const definition = definitionForInstance(node, ctx);
  if (!definition || ctx.depth >= MAX_DEPTH || definition.root.type === 'instance') return 'div';
  return definition.root.tag ?? 'div';
}

export function hasFixedBox(node: NestedNode): boolean {
  return (
    node.type === 'frame' &&
    node.layout?.width?.mode === 'fixed' &&
    node.layout?.height?.mode === 'fixed'
  );
}

export function isStyleOnly(change: DocumentChange): boolean {
  const command = change.command;
  if (change.reason !== 'command' || !command) return false;
  switch (command.type) {
    case 'setStyle':
    case 'setStyleBlock':
    case 'setTokenInterface':
    case 'setToken':
    case 'removeToken':
    case 'setTokenGroup':
    case 'removeTokenGroup':
    case 'setFont':
    case 'removeFont':
    case 'setBreakpoints':
      return true;
    case 'setProp':
      return command.prop === 'layout';
    default:
      return false;
  }
}

export function joinId(path: string | null, id: string): string {
  return path ? `${path}/${id}` : id;
}

export function repeatKeySegment(value: FieldValue | number | undefined, index: number): string {
  return encodeURIComponent(String(value ?? index));
}

export function resolveFieldBindings(
  bindings: Record<string, string> | undefined,
  scope: Record<string, FieldValue>,
): Record<string, FieldValue> {
  const resolved: Record<string, FieldValue> = {};
  for (const [field, path] of Object.entries(bindings ?? {})) {
    const value = resolvePath(scope, path);
    if (value !== undefined) resolved[field] = value;
  }
  return resolved;
}

export function matchesDisplay(condition: DisplayOn, scope: Record<string, FieldValue>): boolean {
  const value = resolvePath(scope, condition.path);
  if ('truthy' in condition) return condition.truthy ? Boolean(value) : !value;
  if ('equals' in condition) return JSON.stringify(value) === JSON.stringify(condition.equals);
  return false;
}

export function resolvePath(
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

export function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
