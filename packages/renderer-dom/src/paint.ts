import { documentClassNames, type DocumentFile, type NestedNode } from '@facadeur/core';
import { childOverridePath, mergeChildFieldContext } from '@facadeur/core';
import { createRenderContext } from './context';
import {
  cssString,
  definitionForInstance,
  hasFixedBox,
  joinId,
  matchesDisplay,
  MAX_DEPTH,
  repeatKeySegment,
  resolveDocumentFields,
  resolveInstance,
  resolveInstanceFields,
  resolvePath,
  resolveVariants,
  selectedVariantForInstance,
  tagFor,
} from './resolve';
import {
  applyAttributes,
  applyBindings,
  applyImage,
  clearPresentation,
  elementFor,
  isHtmlElement,
  isNativeControlElement,
  readAttributes,
  syncLeadText,
  syncVariants,
} from './presentation';
import type { RenderContext, RenderedNode } from './types';
import { syncSelectOptions } from './select-options';
import { expandStructuralChildren } from './structural-children';
import { repeatedDataScope, scopeForInstance } from './repeat-scope';
import { mountedScope } from './mounted-scope';

const classNameCache = new WeakMap<DocumentFile, Map<string, string>>();

/**
 * Paint a document's root children into `parent`.
 * The root frame itself stays the canvas (the editor draws viewport frames around it),
 * unless `paintRoot` is set. A non-frame root is painted directly.
 */
export function renderDocument(
  document: DocumentFile,
  documents: readonly DocumentFile[],
  parent: HTMLElement,
  options: { paintRoot?: boolean; schemaCatalog?: RenderContext['schemaCatalog'] } = {},
): Map<string, RenderedNode> {
  const ctx = createRenderContext(documents, { schemaCatalog: options.schemaCatalog });
  ctx.catalog.set(document.id, document);
  ctx.scope = mountedScope(
    document,
    resolveDocumentFields(document, ctx.catalog, ctx.schemaCatalog),
  );
  ctx.canvasDocument = document;
  ctx.styleDocumentId = document.id;
  paintCanvas(parent, document, ctx, options.paintRoot === true);
  return ctx.records;
}

export function renderNode(
  node: NestedNode,
  ctx: RenderContext,
  owner: Document = document,
): HTMLElement {
  const el = elementFor(tagFor(node, ctx), owner);
  paint(el, node, ctx);
  return el;
}

export function paintCanvas(
  parent: HTMLElement,
  document: DocumentFile,
  ctx: RenderContext,
  paintRoot: boolean,
): void {
  if (document.root.type === 'frame' && !paintRoot) {
    reconcileChildren(parent, document.root.children ?? [], ctx);
    return;
  }
  reconcileChildren(parent, [document.root], ctx);
  if (
    paintRoot &&
    (document.kind === 'atom' || document.kind === 'component' || document.kind === 'section')
  ) {
    const root = parent.firstElementChild;
    if (isHtmlElement(root) && root.dataset.id === document.root.id) {
      root.dataset.component = document.id;
      syncVariants(root, resolveVariants(document, undefined));
    }
  }
}

export function repaintComponent(
  parent: HTMLElement,
  componentId: string,
  ctx: RenderContext,
): void {
  const selector = `[data-component="${cssString(componentId)}"]`;
  const elements = [...parent.querySelectorAll(selector)];
  for (const el of elements) {
    if (!isHtmlElement(el) || !el.dataset.id) continue;
    const resolved = resolveInstance(el.dataset.id, ctx);
    if (!resolved) continue;
    const childCtx: RenderContext = {
      ...ctx,
      path: resolved.path,
      scope: resolved.scope,
      ownerId: resolved.ownerId,
      depth: resolved.depth,
      repeatScope: resolved.repeatScope,
      childFields: resolved.childFields,
      childFieldPath: resolved.childFieldPath,
    };
    const tag = tagFor(resolved.instance, childCtx);
    let target = el;
    if (el.tagName.toLowerCase() !== tag) {
      const replacement = elementFor(tag, el.ownerDocument);
      el.replaceWith(replacement);
      target = replacement;
    }
    paint(target, resolved.instance, childCtx);
  }
}

function paint(el: HTMLElement, node: NestedNode, ctx: RenderContext): void {
  if (node.type === 'instance') paintInstance(el, node, ctx);
  else paintElement(el, node, ctx);
}

function paintInstance(
  el: HTMLElement,
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): void {
  const id = joinId(ctx.path, node.id);
  const definition = definitionForInstance(node, ctx);
  if (!definition || ctx.depth >= MAX_DEPTH) {
    paintUnknown(el, id, node, ctx);
    return;
  }
  const overridePath = childOverridePath(ctx.childFieldPath, node.id);
  const childOverride = overridePath ? ctx.childFields?.[overridePath] : undefined;
  const effectiveFields = { ...(node.fields ?? {}), ...(childOverride ?? {}) };
  const resolvedScope = resolveInstanceFields(
    node,
    definition,
    ctx.scope,
    ctx.catalog,
    effectiveFields,
    ctx.schemaCatalog,
  );
  const root = definition.root;
  const contextualProps = root.type === 'switch' ? resolvedScope.props : resolvedScope;
  const scope = scopeForInstance(resolvedScope, ctx.repeatScope, contextualProps);
  const selected = selectedVariantForInstance(node, ctx);
  const variants = resolveVariants(definition, {
    ...node.variants,
    ...(selected ? { variant: selected } : {}),
  });
  const ownerDocumentId = ctx.styleDocumentId;
  el.dataset.id = id;
  el.dataset.type = 'instance';
  el.dataset.node = node.id;
  el.dataset.component = node.component;
  if (root.type === 'instance') clearPresentation(el);
  else applyAttributes(el, root.attributes);
  syncVariants(el, variants);
  const bound = applyBindings(el, root.type === 'instance' ? undefined : root.bindings, scope);
  markStyleOwner(el, ownerDocumentId, node.id, definition.id, root.id);
  addClass(el, localClassName(ctx, ownerDocumentId, node.id));
  el.classList.add(...(node.classes ?? []));
  addClass(el, localClassName(ctx, definition.id, root.id));
  el.classList.add(...(root.classes ?? []));
  let text: string | null = null;
  if (root.type === 'text') text = bound.text ?? root.text ?? null;
  else if (root.type === 'frame' && bound.text) text = bound.text;
  if (root.type === 'image') applyImage(el, bound.src ?? root.src, bound.alt ?? root.alt);
  el.hidden = bound.hidden;

  ctx.records.set(id, {
    id,
    nodeType: 'instance',
    tag: el.tagName.toLowerCase(),
    name: node.name ?? definition.name,
    text,
    attributes: readAttributes(el),
    component: node.component,
    fields: scope,
    variants,
    ownerId: ctx.ownerId,
  });

  if (root.type === 'frame') {
    const childFields = mergeChildFieldContext(ctx.childFields, node.childFields, overridePath);
    const childContext = {
      ...ctx,
      path: id,
      styleDocumentId: definition.id,
      scope,
      ownerId: id,
      depth: ctx.depth + 1,
      childFields,
      childFieldPath: overridePath ?? '',
    };
    if (root.repeat) reconcileRepeatedChildren(el, root.children ?? [], childContext, root.repeat);
    else reconcileChildren(el, root.children ?? [], childContext);
  } else if (root.type === 'repeater' || root.type === 'switch') {
    reconcileChildren(el, [root], {
      ...ctx,
      path: id,
      styleDocumentId: definition.id,
      scope,
      ownerId: id,
      depth: ctx.depth + 1,
    });
  } else {
    reconcileChildren(el, [], ctx);
  }
  if (
    root.type === 'frame' &&
    (root.children ?? []).length === 0 &&
    !text &&
    !isNativeControlElement(el) &&
    !hasFixedBox(root)
  ) {
    el.dataset.empty = 'true';
  } else delete el.dataset.empty;
  syncLeadText(el, text);
  syncSelectOptions(el, root.type === 'instance' ? undefined : root.bindings, scope);
}

function paintElement(
  el: HTMLElement,
  node: Exclude<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): void {
  const id = joinId(ctx.path, node.id);
  const ownerDocumentId = ctx.styleDocumentId;
  el.dataset.id = id;
  el.dataset.type = node.type;
  el.dataset.node = node.id;
  delete el.dataset.component;
  applyAttributes(el, node.attributes);
  syncVariants(el, {});
  const bound = applyBindings(el, node.bindings, ctx.scope);
  markStyleOwner(el, ownerDocumentId, node.id);
  addClass(el, localClassName(ctx, ownerDocumentId, node.id));
  let text: string | null = null;
  if (node.type === 'text') text = bound.text ?? node.text ?? null;
  else if (node.type === 'frame' && bound.text) text = bound.text;
  if (node.type === 'image') applyImage(el, bound.src ?? node.src, bound.alt ?? node.alt);
  el.hidden = bound.hidden;

  ctx.records.set(id, {
    id,
    nodeType: node.type,
    tag: el.tagName.toLowerCase(),
    name: node.name ?? null,
    text,
    attributes: readAttributes(el),
    component: null,
    fields: null,
    variants: null,
    ownerId: ctx.ownerId,
  });

  if (node.type === 'frame') {
    // The instance element already stands for the component root frame.
    // Every frame under it adds its own segment so data-id stays addressable.
    const childContext = { ...ctx, path: id };
    if (node.repeat) reconcileRepeatedChildren(el, node.children ?? [], childContext, node.repeat);
    else reconcileChildren(el, node.children ?? [], childContext);
  } else {
    reconcileChildren(el, [], ctx);
  }
  if (
    node.type === 'frame' &&
    (node.children ?? []).length === 0 &&
    !text &&
    !isNativeControlElement(el) &&
    !hasFixedBox(node)
  ) {
    el.dataset.empty = 'true';
  } else delete el.dataset.empty;
  syncLeadText(el, text);
  syncSelectOptions(el, node.bindings, ctx.scope);
}

function paintUnknown(
  el: HTMLElement,
  id: string,
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): void {
  const ownerDocumentId = ctx.styleDocumentId;
  el.dataset.id = id;
  el.dataset.type = 'instance';
  el.dataset.node = node.id;
  el.dataset.component = node.component;
  markStyleOwner(el, ownerDocumentId, node.id);
  el.className = 'ds-unknown';
  addClass(el, localClassName(ctx, ownerDocumentId, node.id));
  const text = `Unknown component: ${node.component}`;
  reconcileChildren(el, [], ctx);
  syncLeadText(el, text);
  ctx.records.set(id, {
    id,
    nodeType: 'instance',
    tag: el.tagName.toLowerCase(),
    name: node.name ?? null,
    text,
    attributes: { class: 'ds-unknown' },
    component: node.component,
    fields: node.fields ?? null,
    variants: node.variants ?? null,
    ownerId: ctx.ownerId,
  });
}

function reconcileChildren(
  parent: HTMLElement,
  children: readonly NestedNode[],
  ctx: RenderContext,
): void {
  const existing = new Map<string, HTMLElement>();
  for (const child of [...parent.children]) {
    if (isHtmlElement(child) && child.dataset.id) existing.set(child.dataset.id, child);
  }
  const next: HTMLElement[] = [];
  for (const { node: child, context } of expandStructuralChildren(children, ctx)) {
    const id = joinId(context.path, child.id);
    if (child.displayOn && !matchesDisplay(child.displayOn, context.scope)) {
      const hidden = existing.get(id);
      if (hidden) {
        dropRecords(ctx.records, id);
        hidden.remove();
        existing.delete(id);
      }
      continue;
    }
    let el = existing.get(id);
    const tag = tagFor(child, context);
    if (el && el.tagName.toLowerCase() !== tag) {
      dropRecords(ctx.records, id);
      el.remove();
      el = undefined;
    }
    if (!el) el = elementFor(tag, parent.ownerDocument);
    existing.delete(id);
    paint(el, child, context);
    next.push(el);
  }
  for (const [id, el] of existing) {
    dropRecords(ctx.records, id);
    el.remove();
  }
  for (const el of next) parent.append(el);
}

function reconcileRepeatedChildren(
  parent: HTMLElement,
  children: readonly NestedNode[],
  ctx: RenderContext,
  repeat: NonNullable<Extract<NestedNode, { type: 'frame' }>['repeat']>,
): void {
  const source = resolvePath(ctx.scope, repeat.path);
  const items = Array.isArray(source) ? source : [];
  const existing = new Map<string, HTMLElement>();
  for (const child of [...parent.children]) {
    if (isHtmlElement(child) && child.dataset.id) existing.set(child.dataset.id, child);
  }
  const next: HTMLElement[] = [];
  const itemName = repeat.as ?? 'item';
  items.forEach((item, index) => {
    const keyValue = repeat.key ? resolvePath(item, repeat.key) : index;
    const key = repeatKeySegment(keyValue, index);
    const repeated = repeatedDataScope(ctx.scope, item, index, itemName, ctx.repeatScope);
    const itemContext = {
      ...ctx,
      path: joinId(ctx.path, key),
      scope: repeated.scope,
      repeatScope: repeated.repeatScope,
    };
    for (const child of children) {
      const id = joinId(itemContext.path, child.id);
      if (child.displayOn && !matchesDisplay(child.displayOn, itemContext.scope)) continue;
      let el = existing.get(id);
      const tag = tagFor(child, itemContext);
      if (el && el.tagName.toLowerCase() !== tag) {
        dropRecords(ctx.records, id);
        el.remove();
        el = undefined;
      }
      if (!el) el = elementFor(tag, parent.ownerDocument);
      paint(el, child, itemContext);
      next.push(el);
      existing.delete(id);
    }
  });
  for (const [id, el] of existing) {
    dropRecords(ctx.records, id);
    el.remove();
  }
  for (const el of next) parent.append(el);
}

function dropRecords(records: Map<string, RenderedNode>, id: string): void {
  for (const key of [...records.keys()]) {
    if (key === id || key.startsWith(`${id}/`)) records.delete(key);
  }
}

function localClassName(
  ctx: RenderContext,
  documentId: string | null,
  nodeId: string,
): string | undefined {
  if (!documentId) return undefined;
  const document = ctx.catalog.get(documentId);
  if (!document) return undefined;
  let names = classNameCache.get(document);
  if (!names) {
    names = documentClassNames(document);
    classNameCache.set(document, names);
  }
  return names.get(nodeId);
}

function markStyleOwner(
  el: HTMLElement,
  ownerDocumentId: string | null,
  nodeId: string,
  childDocumentId?: string,
  childRootId?: string,
): void {
  const owners = new Set<string>();
  if (ownerDocumentId) owners.add(styleNodeToken(ownerDocumentId, nodeId));
  if (childDocumentId && childRootId) owners.add(styleNodeToken(childDocumentId, childRootId));
  if (owners.size > 0) el.dataset.styleNode = [...owners].join(' ');
  else delete el.dataset.styleNode;
  if (ownerDocumentId) el.dataset.styleDocument = ownerDocumentId;
  else delete el.dataset.styleDocument;
}

function styleNodeToken(documentId: string, nodeId: string): string {
  return `${documentId}:${nodeId}`;
}

function addClass(el: HTMLElement, name: string | undefined): void {
  if (name) el.classList.add(name);
}
