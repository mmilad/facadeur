import type {
  Binding,
  DocumentChange,
  DocumentFile,
  DocumentStore,
  DisplayOn,
  FieldDefinition,
  FieldValue,
  NestedNode,
} from '@facadeur/core';
import { isVariantAxis, resolveVariantDocument, toNested, variantPresets } from '@facadeur/core';

export interface RenderedNode {
  id: string;
  nodeType: NestedNode['type'];
  tag: string;
  name: string | null;
  text: string | null;
  attributes: Record<string, string>;
  component: string | null;
  fields: Record<string, FieldValue> | null;
  variants: Record<string, string> | null;
  ownerId: string | null;
}

export interface RenderContext {
  catalog: Map<string, DocumentFile>;
  records: Map<string, RenderedNode>;
  path: string | null;
  scope: Record<string, FieldValue>;
  ownerId: string | null;
  depth: number;
  /** Document whose root children are the canvas. Used to resolve instance paths. */
  canvasId: string | null;
  /** Resolved canvas document for preview-only mounted variants. */
  canvasDocument: DocumentFile | null;
}

export interface DocumentStyles {
  setDocument(
    document: DocumentFile,
    options?: { address?: 'instance' | 'canvas'; paintRoot?: boolean },
  ): void;
  removeDocument?(id: string): void;
}

export interface DomRenderer {
  readonly records: Map<string, RenderedNode>;
  /** Paint `document` into the parent. Root frame children are the canvas contents. */
  mount(document: DocumentFile): Map<string, RenderedNode>;
  /** Keep this parent in sync with one store. Style changes do not rebuild elements. */
  connect(store: DocumentStore): () => void;
  destroy(): void;
}

const EVENT_ATTRIBUTE = /^on/i;
const MAX_DEPTH = 32;

function isNativeControlElement(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return tag === 'input' || tag === 'select' || tag === 'textarea';
}

function hasFixedBox(node: NestedNode): boolean {
  return (
    node.type === 'frame' &&
    node.layout?.width?.mode === 'fixed' &&
    node.layout?.height?.mode === 'fixed'
  );
}

export function createRenderContext(documents: readonly DocumentFile[]): RenderContext {
  const catalog = new Map<string, DocumentFile>();
  for (const document of documents) catalog.set(document.id, document);
  return {
    catalog,
    records: new Map(),
    path: null,
    scope: {},
    ownerId: null,
    depth: 0,
    canvasId: null,
    canvasDocument: null,
  };
}

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
  if (paintRoot && (document.kind === 'atom' || document.kind === 'component')) {
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

function resolveInstance(
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

function repeatedItem(
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
    if (key === segment) {
      return { key, scope: { ...scope, [itemName]: item } };
    }
  }
  return undefined;
}

function findCanvasChild(ctx: RenderContext, id: string): NestedNode | undefined {
  const document = ctx.canvasDocument ?? (ctx.canvasId ? ctx.catalog.get(ctx.canvasId) : undefined);
  const documents = document ? [document] : [...ctx.catalog.values()];
  for (const entry of documents) {
    if (entry.root.id === id) return entry.root;
    if (entry.root.type !== 'frame') {
      continue;
    }
    const child = (entry.root.children ?? []).find((node) => node.id === id);
    if (child) return child;
  }
  return undefined;
}

function paint(el: HTMLElement, node: NestedNode, ctx: RenderContext): void {
  if (node.type === 'instance') paintInstance(el, node, ctx);
  else paintElement(el, node, ctx);
}

function definitionForInstance(
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): DocumentFile | undefined {
  const base = ctx.catalog.get(node.component);
  if (!base) return undefined;
  const hasNamedVariants = variantPresets(base).some((variant) => variant.name !== 'default');
  const selected = hasNamedVariants ? node.variants?.variant : undefined;
  return selected ? resolveVariantDocument(base, selected) : base;
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
  const scope = resolveFields(definition.fields, {
    ...(node.fields ?? {}),
    ...resolveFieldBindings(node.fieldBindings, ctx.scope),
  });
  const variants = resolveVariants(definition, node.variants);
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
    const childContext = {
      ...ctx,
      path: id,
      scope,
      ownerId: id,
      depth: ctx.depth + 1,
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

function tagFor(node: NestedNode, ctx: RenderContext): string {
  if (node.type !== 'instance') {
    return node.tag ?? (node.type === 'text' ? 'span' : node.type === 'image' ? 'img' : 'div');
  }
  const definition = definitionForInstance(node, ctx);
  if (!definition || ctx.depth >= MAX_DEPTH || definition.root.type === 'instance') return 'div';
  return definition.root.tag ?? 'div';
}

/**
 * Elements are born in the parent's document so an iframe renderer stays inside that frame.
 * `instanceof HTMLElement` is false for those nodes in the parent realm, so checks use nodeType.
 */
function elementFor(tag: string, owner: Document): HTMLElement {
  return owner.createElement(tag);
}

function isHtmlElement(value: unknown): value is HTMLElement {
  return isNode(value) && value.nodeType === Node.ELEMENT_NODE && 'dataset' in value;
}

function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && 'nodeType' in value;
}

function syncLeadText(parent: HTMLElement, text: string | null): void {
  const texts = [...parent.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE);
  if (!text) {
    for (const node of texts) node.remove();
    return;
  }
  const first = texts[0];
  if (first) {
    if (first.textContent !== text) first.textContent = text;
    for (const extra of texts.slice(1)) extra.remove();
    if (parent.firstChild !== first) parent.insertBefore(first, parent.firstChild);
    return;
  }
  parent.insertBefore(parent.ownerDocument.createTextNode(text), parent.firstChild);
}

function syncVariants(el: HTMLElement, variants: Record<string, string>): void {
  for (const attribute of [...el.attributes]) {
    if (attribute.name === 'data-variant') {
      if (variants.variant === undefined) el.removeAttribute(attribute.name);
      continue;
    }
    if (!attribute.name.startsWith('data-variant-')) continue;
    const axis = attribute.name.slice('data-variant-'.length);
    if (variants[axis] === undefined) el.removeAttribute(attribute.name);
  }
  for (const [axis, value] of Object.entries(variants)) {
    if (axis === 'variant') el.setAttribute('data-variant', value);
    else el.setAttribute(`data-variant-${axis}`, value);
  }
}

function dropRecords(records: Map<string, RenderedNode>, id: string): void {
  for (const key of [...records.keys()]) {
    if (key === id || key.startsWith(`${id}/`)) records.delete(key);
  }
}

function isStyleOnly(change: DocumentChange): boolean {
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

function resolveFields(
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

function resolveVariants(
  document: DocumentFile,
  overrides: Record<string, string> | undefined,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  const hasNamedVariants = variantPresets(document).some((variant) => variant.name !== 'default');
  for (const axis of (document.variants ?? []).filter(isVariantAxis)) {
    const fallback = axis.default ?? axis.values[0];
    if (fallback !== undefined) resolved[axis.name] = fallback;
  }
  if (hasNamedVariants) {
    resolved.variant = overrides?.variant ?? 'default';
  }
  for (const [name, value] of Object.entries(overrides ?? {})) {
    if (name === 'variant' && !hasNamedVariants) continue;
    resolved[name] = value;
  }
  return resolved;
}

function clearPresentation(el: HTMLElement): void {
  applyAttributes(el, {});
}

function applyAttributes(el: HTMLElement, attributes: Record<string, string> | undefined): void {
  const desired: Record<string, string> = {};
  for (const [name, value] of Object.entries(attributes ?? {})) {
    if (EVENT_ATTRIBUTE.test(name)) continue;
    desired[name] = value;
  }
  for (const attribute of [...el.attributes]) {
    if (attribute.name.startsWith('data-') || attribute.name === 'style') continue;
    if (desired[attribute.name] === undefined) el.removeAttribute(attribute.name);
  }
  for (const [name, value] of Object.entries(desired)) el.setAttribute(name, value);
}

function applyImage(el: HTMLElement, src: string | undefined, alt: string | undefined): void {
  if (src !== undefined) el.setAttribute('src', src);
  else el.removeAttribute('src');
  if (alt !== undefined) el.setAttribute('alt', alt);
  else el.removeAttribute('alt');
}

function applyBindings(
  el: HTMLElement,
  bindings: Binding[] | undefined,
  scope: Record<string, FieldValue>,
): { text: string | null; src?: string; alt?: string; hidden: boolean } {
  let text: string | null = null;
  let src: string | undefined;
  let alt: string | undefined;
  let hidden = false;
  for (const binding of bindings ?? []) {
    const value = scope[binding.field];
    if (value === undefined) continue;
    if (binding.target === 'text') text = String(value);
    else if (
      binding.target === 'attribute' &&
      binding.name &&
      !EVENT_ATTRIBUTE.test(binding.name)
    ) {
      el.setAttribute(binding.name, String(value));
    } else if (binding.target === 'style' && binding.name) {
      el.style.setProperty(binding.name, String(value));
    } else if (binding.target === 'src') src = String(value);
    else if (binding.target === 'alt') alt = String(value);
    else if (binding.target === 'visible') hidden = value === false;
  }
  return { text, src, alt, hidden };
}

function readAttributes(el: HTMLElement): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attribute of el.attributes) {
    if (attribute.name === 'style' || attribute.name.startsWith('data-')) continue;
    attributes[attribute.name] = attribute.value;
  }
  return attributes;
}

function joinId(path: string | null, id: string): string {
  return path ? `${path}/${id}` : id;
}

function repeatKeySegment(value: FieldValue | number | undefined, index: number): string {
  return encodeURIComponent(String(value ?? index));
}

function resolveFieldBindings(
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

function matchesDisplay(condition: DisplayOn, scope: Record<string, FieldValue>): boolean {
  const value = resolvePath(scope, condition.path);
  if ('truthy' in condition) return condition.truthy ? Boolean(value) : !value;
  if ('equals' in condition) {
    return JSON.stringify(value) === JSON.stringify(condition.equals);
  }
  return false;
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

function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
