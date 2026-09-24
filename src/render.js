/**
 * Render a facadeur JSON tree into DOM elements.
 *
 * Element nodes carry tagName, text, attributes, and children.
 * Component nodes carry type, props, and optional variants. A component
 * expands through a JSON catalog: templates are data, with {{prop}}
 * placeholders, and never functions.
 */

const SKIP_ATTRIBUTE = /^on/i;

export function createContext(components) {
  return {
    components: components ?? {},
    nodes: new Map(),
    counter: 0,
  };
}

/**
 * @param {object} node
 * @param {ReturnType<typeof createContext>} ctx
 * @param {string | null} ownerId component instance that contains this node
 */
export function renderNode(node, ctx, ownerId = null) {
  if (node && typeof node.type === 'string') {
    return renderComponent(node, ctx, ownerId);
  }
  return buildElement(node, ctx, ownerId);
}

function renderComponent(node, ctx, ownerId) {
  const id = node.id || nextId(ctx);
  const def = ctx.components[node.type];
  const scope = {
    ...(def?.defaults ?? {}),
    ...(node.props ?? {}),
    ...(node.variants ?? {}),
  };

  let template;
  if (!def?.template) {
    template = {
      tagName: 'div',
      attributes: { class: 'ds-unknown' },
      text: `Unknown component: ${node.type}`,
    };
  } else {
    template = interpolate(structuredClone(def.template), scope);
  }

  const templateChildren = (template.children ?? []).map((child) =>
    prefixIds(child, id, ctx),
  );

  return buildElement(
    {
      id,
      tagName: template.tagName,
      text: template.text,
      attributes: template.attributes,
      x: node.x ?? template.x,
      y: node.y ?? template.y,
      width: node.width ?? template.width,
      height: node.height ?? template.height,
      children: [...templateChildren, ...(node.children ?? [])],
      meta: {
        kind: 'component',
        type: node.type,
        props: node.props ?? null,
        variants: node.variants ?? null,
      },
    },
    ctx,
    ownerId,
  );
}

/**
 * Build one element and descend into its children.
 * Same shape as the earlier buildElement(config): tagName, text,
 * attributes, children. Events are intentionally not read.
 */
export function buildElement(config, ctx, ownerId = null) {
  const node = config ?? {};
  const id = node.id || nextId(ctx);
  const tagName = node.tagName || 'div';
  const el = document.createElement(tagName);

  el.dataset.id = id;
  el.dataset.kind = node.meta?.kind || 'element';
  if (node.meta?.type) el.dataset.type = node.meta.type;

  const text = node.text == null ? null : String(node.text);
  const attributes = {};
  if (node.attributes) {
    for (const [name, value] of Object.entries(node.attributes)) {
      if (!isAttributeValue(value) || SKIP_ATTRIBUTE.test(name)) continue;
      attributes[name] = String(value);
      el.setAttribute(name, attributes[name]);
    }
  }

  ctx.nodes.set(id, {
    id,
    kind: node.meta?.kind || 'element',
    type: node.meta?.type ?? null,
    tagName,
    text,
    attributes,
    props: node.meta?.props ?? null,
    variants: node.meta?.variants ?? null,
    ownerId: ownerId ?? null,
  });

  applyFrame(el, node);

  if (text) el.append(document.createTextNode(text));

  const nextOwner = node.meta?.kind === 'component' ? id : ownerId;
  for (const child of node.children ?? []) {
    el.append(renderNode(child, ctx, nextOwner));
  }

  return el;
}

function prefixIds(node, parentId, ctx) {
  const local = node.id || nextId(ctx);
  const id = `${parentId}/${local}`;
  const copy = { ...node, id };
  if (Array.isArray(node.children)) {
    copy.children = node.children.map((child) => prefixIds(child, id, ctx));
  }
  return copy;
}

function nextId(ctx) {
  ctx.counter += 1;
  return `n${ctx.counter}`;
}

function interpolate(value, scope) {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => {
      const found = scope[key];
      return found == null ? '' : String(found);
    });
  }
  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, scope));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = interpolate(item, scope);
    }
    return out;
  }
  return value;
}

function applyFrame(el, node) {
  const parts = [];
  if (node.x != null || node.y != null) {
    parts.push('position:absolute');
    if (node.x != null) parts.push(`left:${Number(node.x)}px`);
    if (node.y != null) parts.push(`top:${Number(node.y)}px`);
  }
  if (node.width != null) parts.push(`width:${Number(node.width)}px`);
  if (node.height != null) parts.push(`height:${Number(node.height)}px`);
  if (!parts.length) return;

  const existing = el.getAttribute('style');
  el.setAttribute(
    'style',
    existing ? `${existing.replace(/;\s*$/, '')};${parts.join(';')}` : parts.join(';'),
  );
}

function isAttributeValue(value) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
