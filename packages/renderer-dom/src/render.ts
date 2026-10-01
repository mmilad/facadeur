import type { DocumentFile, NestedNode } from '@facadeur/core';
import { childOverridePath, mergeChildFieldContext, toNested } from '@facadeur/core';
import { createRenderContext } from './context.js';
import {
  cssString,
  definitionForInstance,
  hasFixedBox,
  isStyleOnly,
  joinId,
  matchesDisplay,
  MAX_DEPTH,
  repeatKeySegment,
  resolveFieldBindings,
  resolveFields,
  resolveInstance,
  resolvePath,
  resolveVariants,
  selectedVariantForInstance,
  tagFor,
} from './resolve.js';
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
} from './presentation.js';
import type { DocumentStyles, DomRenderer, RenderContext, RenderedNode } from './types.js';

export type { DocumentStyles, DomRenderer, RenderContext, RenderedNode } from './types.js';
export { createRenderContext } from './context.js';

/**
 * Paint a document's root children into `parent`.
 * The root frame itself stays the canvas (the editor draws viewport frames around it),
 * unless `paintRoot` is set. A non-frame root is painted directly.
 */
export function renderDocument(
  document: DocumentFile,
  documents: readonly DocumentFile[],
  parent: HTMLElement,
  options: { paintRoot?: boolean } = {},
): Map<string, RenderedNode> {
  const ctx = createRenderContext(documents);
  ctx.catalog.set(document.id, document);
  ctx.scope = resolveFields(document.fields, undefined);
  ctx.canvasDocument = document;
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

export function createDomRenderer(options: {
  parent: HTMLElement;
  catalog: readonly DocumentFile[];
  styles?: DocumentStyles;
  /** Resolve the mounted document for a preview-only editor context. */
  resolveMountedDocument?: (document: DocumentFile) => DocumentFile;
  prepareInstanceDocument?: (document: DocumentFile, variant: string | undefined) => DocumentFile;
  /** When set, the root node is painted. Pages omit this: the root frame is the canvas. */
  paintRoot?: boolean;
}): DomRenderer {
  const parent = options.parent;
  const paintRoot = options.paintRoot === true;
  const catalog = new Map<string, DocumentFile>();
  for (const document of options.catalog) catalog.set(document.id, document);
  const records = new Map<string, RenderedNode>();
  let mountedId: string | null = null;
  const unsubscribers: (() => void)[] = [];

  function context(): RenderContext {
    const mounted = mountedId ? catalog.get(mountedId) : undefined;
    const canvas = mounted ? mountedDocument(mounted) : undefined;
    return {
      catalog,
      records,
      path: null,
      scope: canvas ? resolveFields(canvas.fields, undefined) : {},
      ownerId: null,
      depth: 0,
      canvasId: mountedId,
      canvasDocument: canvas ?? null,
      prepareInstanceDocument: options.prepareInstanceDocument,
    };
  }

  function mountedDocument(document: DocumentFile): DocumentFile {
    return options.resolveMountedDocument?.(document) ?? document;
  }

  function syncStyles(document: DocumentFile): void {
    const mountedAsCanvas = document.id === mountedId && !paintRoot;
    const address = mountedAsCanvas ? 'canvas' : 'instance';
    options.styles?.setDocument(document, {
      address,
      ...(document.id === mountedId && paintRoot ? { paintRoot: true } : {}),
    });
  }

  function paintMounted(): void {
    if (!mountedId) return;
    const source = catalog.get(mountedId);
    if (!source) return;
    const document = mountedDocument(source);
    const ctx = context();
    ctx.scope = resolveFields(document.fields, undefined);
    paintCanvas(parent, document, ctx, paintRoot);
  }

  const renderer: DomRenderer = {
    records,
    mount(document) {
      mountedId = document.id;
      catalog.set(document.id, document);
      for (const entry of catalog.values()) syncStyles(mountedDocument(entry));
      records.clear();
      paintMounted();
      return records;
    },
    connect(store) {
      const unsubscribe = store.subscribe((change) => {
        const next = toNested(store.getDocument());
        catalog.set(next.id, next);
        syncStyles(next.id === mountedId ? mountedDocument(next) : next);
        if (isStyleOnly(change)) return;
        if (next.id === mountedId) {
          paintMounted();
          return;
        }
        repaintComponent(parent, next.id, context());
      });
      unsubscribers.push(unsubscribe);
      return unsubscribe;
    },
    destroy() {
      for (const unsubscribe of unsubscribers) unsubscribe();
      unsubscribers.length = 0;
      if (mountedId) options.styles?.removeDocument?.(mountedId);
      records.clear();
    },
  };

  return renderer;
}

function paintCanvas(
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

function repaintComponent(parent: HTMLElement, componentId: string, ctx: RenderContext): void {
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
  const scope = resolveFields(definition.fields, {
    ...effectiveFields,
    ...resolveFieldBindings(node.fieldBindings, ctx.scope),
  });
  const selected = selectedVariantForInstance(node, ctx);
  const variants = resolveVariants(definition, {
    ...node.variants,
    ...(selected ? { variant: selected } : {}),
  });
  const root = definition.root;
  el.dataset.id = id;
  el.dataset.type = 'instance';
  el.dataset.node = node.id;
  el.dataset.component = node.component;
  if (root.type === 'instance') clearPresentation(el);
  else applyAttributes(el, root.attributes);
  syncVariants(el, variants);
  const bound = applyBindings(el, root.type === 'instance' ? undefined : root.bindings, scope);
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
      scope,
      ownerId: id,
      depth: ctx.depth + 1,
      childFields,
      childFieldPath: overridePath ?? '',
    };
    if (root.repeat) reconcileRepeatedChildren(el, root.children ?? [], childContext, root.repeat);
    else reconcileChildren(el, root.children ?? [], childContext);
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
}

function paintElement(
  el: HTMLElement,
  node: Exclude<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): void {
  const id = joinId(ctx.path, node.id);
  el.dataset.id = id;
  el.dataset.type = node.type;
  el.dataset.node = node.id;
  delete el.dataset.component;
  applyAttributes(el, node.attributes);
  syncVariants(el, {});
  const bound = applyBindings(el, node.bindings, ctx.scope);
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
}

function paintUnknown(
  el: HTMLElement,
  id: string,
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): void {
  el.dataset.id = id;
  el.dataset.type = 'instance';
  el.dataset.node = node.id;
  el.dataset.component = node.component;
  el.className = 'ds-unknown';
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
  for (const child of children) {
    const id = joinId(ctx.path, child.id);
    if (child.displayOn && !matchesDisplay(child.displayOn, ctx.scope)) {
      const hidden = existing.get(id);
      if (hidden) {
        dropRecords(ctx.records, id);
        hidden.remove();
        existing.delete(id);
      }
      continue;
    }
    let el = existing.get(id);
    const tag = tagFor(child, ctx);
    if (el && el.tagName.toLowerCase() !== tag) {
      dropRecords(ctx.records, id);
      el.remove();
      el = undefined;
    }
    if (!el) el = elementFor(tag, parent.ownerDocument);
    existing.delete(id);
    paint(el, child, ctx);
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
    const itemContext = {
      ...ctx,
      path: joinId(ctx.path, key),
      scope: { ...ctx.scope, [itemName]: item },
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
