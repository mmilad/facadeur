import type {
  Binding,
  DocumentFile,
  FieldDefinition,
  FieldValue,
  Layout,
  NestedNode,
  VariantAxis,
} from '@facadeur/core';

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
}

const EVENT_ATTRIBUTE = /^on/i;
const MAX_DEPTH = 32;

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
  };
}

/**
 * Paint a document's root children into `parent`.
 * The root frame itself stays the canvas (the editor draws the artboard around it).
 * A non-frame root is painted directly.
 */
export function renderDocument(
  document: DocumentFile,
  documents: readonly DocumentFile[],
  parent: HTMLElement,
): Map<string, RenderedNode> {
  const ctx = createRenderContext(documents);
  if (document.root.type === 'frame') {
    for (const child of document.root.children ?? []) {
      parent.append(renderNode(child, ctx));
    }
  } else {
    parent.append(renderNode(document.root, ctx));
  }
  return ctx.records;
}

export function renderNode(node: NestedNode, ctx: RenderContext): HTMLElement {
  if (node.type === 'instance') return renderInstance(node, ctx);
  return renderElement(node, ctx);
}

function renderInstance(
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): HTMLElement {
  const id = joinId(ctx.path, node.id);
  const definition = ctx.catalog.get(node.component);
  if (!definition || ctx.depth >= MAX_DEPTH) {
    return unknownComponent(id, node, ctx);
  }
  const scope = resolveFields(definition.fields, node.fields);
  const variants = resolveVariants(definition.variants, node.variants);
  const root = definition.root;
  const tag = root.type === 'instance' ? 'div' : (root.tag ?? 'div');
  const el = document.createElement(tag);
  el.dataset.id = id;
  el.dataset.type = 'instance';
  el.dataset.component = node.component;
  if (root.type !== 'instance') applyAttributes(el, root.attributes);
  for (const [axis, value] of Object.entries(variants)) {
    el.setAttribute(`data-variant-${axis}`, value);
  }
  const layout = mergeLayout(root.type === 'instance' ? undefined : root.layout, node.layout);
  applyLayout(el, layout, root.type === 'frame' || root.type === 'instance');
  const bound = applyBindings(el, root.type === 'instance' ? undefined : root.bindings, scope);
  let text: string | null = null;
  if (root.type === 'text') {
    text = bound.text ?? root.text ?? null;
    if (text) el.append(document.createTextNode(text));
  } else if (root.type === 'frame' && bound.text) {
    text = bound.text;
    el.append(document.createTextNode(text));
  }
  if (root.type === 'image') {
    const src = bound.src ?? root.src;
    const alt = bound.alt ?? root.alt;
    if (src !== undefined) el.setAttribute('src', src);
    if (alt !== undefined) el.setAttribute('alt', alt);
  }
  if (bound.hidden) el.hidden = true;

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
    const childCtx: RenderContext = {
      ...ctx,
      path: id,
      scope,
      ownerId: id,
      depth: ctx.depth + 1,
    };
    for (const child of root.children ?? []) {
      el.append(renderNode(child, childCtx));
    }
  }
  return el;
}

function renderElement(
  node: Exclude<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): HTMLElement {
  const id = joinId(ctx.path, node.id);
  const tag = node.tag ?? (node.type === 'text' ? 'span' : node.type === 'image' ? 'img' : 'div');
  const el = document.createElement(tag);
  el.dataset.id = id;
  el.dataset.type = node.type;
  applyAttributes(el, node.attributes);
  applyLayout(el, node.layout, node.type === 'frame');
  const bound = applyBindings(el, node.bindings, ctx.scope);
  let text: string | null = null;
  if (node.type === 'text') {
    text = bound.text ?? node.text ?? null;
    if (text) el.append(document.createTextNode(text));
  } else if (node.type === 'frame' && bound.text) {
    text = bound.text;
    el.append(document.createTextNode(text));
  }
  if (node.type === 'image') {
    const src = bound.src ?? node.src;
    const alt = bound.alt ?? node.alt;
    if (src !== undefined) el.setAttribute('src', src);
    if (alt !== undefined) el.setAttribute('alt', alt);
  }
  if (bound.hidden) el.hidden = true;

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
    for (const child of node.children ?? []) {
      el.append(renderNode(child, ctx));
    }
  }
  return el;
}

function unknownComponent(
  id: string,
  node: Extract<NestedNode, { type: 'instance' }>,
  ctx: RenderContext,
): HTMLElement {
  const el = document.createElement('div');
  el.dataset.id = id;
  el.dataset.type = 'instance';
  el.dataset.component = node.component;
  el.className = 'ds-unknown';
  const text = `Unknown component: ${node.component}`;
  el.textContent = text;
  applyLayout(el, node.layout, false);
  ctx.records.set(id, {
    id,
    nodeType: 'instance',
    tag: 'div',
    name: node.name ?? null,
    text,
    attributes: { class: 'ds-unknown' },
    component: node.component,
    fields: node.fields ?? null,
    variants: node.variants ?? null,
    ownerId: ctx.ownerId,
  });
  return el;
}

function resolveFields(
  fields: FieldDefinition[] | undefined,
  overrides: Record<string, FieldValue> | undefined,
): Record<string, FieldValue> {
  const resolved: Record<string, FieldValue> = {};
  for (const field of fields ?? []) {
    if (field.default !== undefined) resolved[field.name] = field.default;
  }
  for (const [name, value] of Object.entries(overrides ?? {})) {
    resolved[name] = value;
  }
  return resolved;
}

function resolveVariants(
  axes: VariantAxis[] | undefined,
  overrides: Record<string, string> | undefined,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const axis of axes ?? []) {
    const fallback = axis.default ?? axis.values[0];
    if (fallback !== undefined) resolved[axis.name] = fallback;
  }
  for (const [name, value] of Object.entries(overrides ?? {})) {
    resolved[name] = value;
  }
  return resolved;
}

function applyAttributes(el: HTMLElement, attributes: Record<string, string> | undefined): void {
  for (const [name, value] of Object.entries(attributes ?? {})) {
    if (EVENT_ATTRIBUTE.test(name)) continue;
    el.setAttribute(name, value);
  }
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

function applyLayout(el: HTMLElement, layout: Layout | undefined, isFrame: boolean): void {
  if (layout?.position === 'absolute') {
    el.style.position = 'absolute';
    if (layout.x !== undefined) el.style.left = `${layout.x}px`;
    if (layout.y !== undefined) el.style.top = `${layout.y}px`;
  } else if (isFrame) {
    el.style.position = 'relative';
  }
  if (layout?.width !== undefined) el.style.width = `${layout.width}px`;
  if (layout?.height !== undefined) el.style.height = `${layout.height}px`;
}

function mergeLayout(base: Layout | undefined, override: Layout | undefined): Layout | undefined {
  if (!base && !override) return undefined;
  return { ...base, ...override };
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
