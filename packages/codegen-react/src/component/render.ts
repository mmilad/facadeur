import { type DocumentFile, type NestedNode } from '@facadeur/core';
import {
  booleanAttributeValue,
  isBooleanAttribute,
  isEventAttribute,
  isVoidTag,
  numericAttributeCode,
  reactAttributeName,
} from '../attributes.js';
import { CodegenError, quote } from '../names.js';
import { conditionForNode, dataExpression, repeatLocalName } from './render/data-expressions.js';
import { eventAttributes } from './render/event-attributes.js';
import { bindingsFor } from './render/field-bindings.js';
import { isJsxName, jsxText } from './render/jsx-text.js';
import { renderInstance } from './render/render-instance.js';
import type {
  Attr,
  Bound,
  CatalogEntry,
  ComponentImport,
  ElementNode,
  Expr,
  TextChild,
} from './types.js';

export function renderNode(
  document: DocumentFile,
  node: NestedNode,
  catalog: Map<string, CatalogEntry>,
  owner: CatalogEntry,
  isRoot: boolean,
  imports: Map<string, ComponentImport>,
  usedProps: Set<string>,
  markStyle: () => void,
  dataScope: ReadonlyMap<string, string> = new Map(),
  childFieldsProp?: string,
): ElementNode {
  if (node.type === 'instance') {
    return renderInstance(node, catalog, imports, owner, usedProps, dataScope, childFieldsProp);
  }
  const tag = node.tag ?? (node.type === 'text' ? 'span' : node.type === 'image' ? 'img' : 'div');
  const children = node.type === 'frame' ? (node.children ?? []) : [];
  if (isVoidTag(tag) && children.length > 0) {
    throw new CodegenError(
      `Void element <${tag}> in "${document.id}/${node.id}" cannot have children`,
    );
  }
  const bound = bindingsFor(node.bindings, owner, usedProps);
  const attrs: Attr[] = [];
  if (isRoot) {
    attrs.push({ name: 'data-component', value: { kind: 'literal', value: document.id } });
    attrs.push({ name: 'data-node', value: { kind: 'expr', code: 'nodeId' } });
    for (const prop of owner.variants.values()) {
      attrs.push({
        name: `data-variant-${prop.source}`,
        value: { kind: 'expr', code: prop.name },
      });
    }
    if (owner.namedVariant) {
      attrs.push({
        name: 'data-variant',
        value: { kind: 'expr', code: owner.namedVariant.name },
      });
    }
  } else {
    attrs.push({ name: 'data-node', value: { kind: 'literal', value: node.id } });
  }

  const consumed = new Set<string>();
  for (const [name, value] of Object.entries(node.attributes ?? {})) {
    if (isEventAttribute(name)) continue;
    const reactName = reactAttributeName(name);
    if (!isJsxName(reactName)) {
      throw new CodegenError(
        `Attribute "${name}" on "${document.id}/${node.id}" cannot be expressed in JSX`,
      );
    }
    if (reactName === 'className' || reactName === 'style') continue;
    if (bound.attrs.has(reactName)) continue;
    consumed.add(reactName);
    attrs.push({ name: reactName, value: staticAttrValue(reactName, value) });
  }
  for (const [name, value] of bound.attrs) {
    if (consumed.has(name)) continue;
    attrs.push({ name, value });
  }
  attrs.push(...eventAttributes(node.eventBindings, owner, usedProps));

  if (node.type === 'image') {
    pushMedia(attrs, 'src', bound.src, node.src);
    pushMedia(attrs, 'alt', bound.alt, node.alt);
  }

  const className = classAttribute(node, bound, isRoot);
  if (className) attrs.push(className);
  const style = styleAttribute(node, bound, markStyle);
  if (style) attrs.push(style);
  if (bound.hidden) attrs.push({ name: 'hidden', value: { kind: 'expr', code: bound.hidden } });

  const childNodes: Array<ElementNode | TextChild> = [];
  let childScope = dataScope;
  let repeat: ElementNode['repeat'];
  if (node.type === 'frame' && node.repeat) {
    const source = dataExpression(node.repeat.path, owner, dataScope, usedProps);
    const alias = node.repeat.as ?? 'item';
    const item = repeatLocalName(alias, owner, dataScope, usedProps);
    const index = `${item}Index`;
    childScope = new Map(dataScope).set(alias, item);
    const key = node.repeat.key
      ? `${dataExpression(`${alias}.${node.repeat.key}`, owner, childScope, usedProps)} ?? ${index}`
      : index;
    // Repeat sources may be optional fields (for example a form's optional
    // `fields` payload). Keep the generated component renderable until data
    // arrives instead of emitting `items.map(...)` on `undefined`.
    repeat = { source: `(${source} ?? [])`, item, index, key };
  }
  const text = textChild(node, bound);
  if (text && !isVoidTag(tag)) childNodes.push({ text });
  if (!isVoidTag(tag)) {
    for (const child of children) {
      childNodes.push(
        renderNode(
          document,
          child,
          catalog,
          owner,
          false,
          imports,
          usedProps,
          markStyle,
          childScope,
          childFieldsProp,
        ),
      );
    }
  }

  return {
    tag,
    attrs,
    children: childNodes,
    void: isVoidTag(tag),
    ...(node.displayOn
      ? { condition: conditionForNode(node.displayOn, owner, dataScope, usedProps) }
      : {}),
    ...(repeat ? { repeat } : {}),
  };
}

function textChild(
  node: Exclude<NestedNode, { type: 'instance' }>,
  bound: Bound,
): string | undefined {
  const literal = node.type === 'text' ? node.text : undefined;
  if (bound.text) return `{${withFallback(bound.text, literal)}}`;
  if (literal !== undefined) return jsxText(literal);
  return undefined;
}

function withFallback(expr: Expr, literal: string | undefined): string {
  if (literal === undefined || !expr.fallback) return expr.code;
  if (expr.code.startsWith('String(') && expr.code.endsWith(')')) {
    const name = expr.code.slice('String('.length, -1);
    return `${name} !== undefined ? ${expr.code} : ${quote(literal)}`;
  }
  return `${expr.code} ?? ${quote(literal)}`;
}

function pushMedia(
  attrs: Attr[],
  name: 'src' | 'alt',
  expr: Expr | undefined,
  literal: string | undefined,
): void {
  if (attrs.some((attr) => attr.name === name)) return;
  if (expr) {
    attrs.push({ name, value: { kind: 'expr', code: withFallback(expr, literal) } });
    return;
  }
  if (literal !== undefined) attrs.push({ name, value: { kind: 'literal', value: literal } });
}

function classAttribute(
  node: Exclude<NestedNode, { type: 'instance' }>,
  bound: Bound,
  isRoot: boolean,
): Attr | undefined {
  const staticClass = classFromAttributes(node.attributes);
  const parts: string[] = [];
  if (staticClass) parts.push(quote(staticClass));
  if (bound.classExpr) parts.push(bound.classExpr);
  if (isRoot) parts.push('className');
  if (parts.length === 0) return undefined;
  if (parts.length === 1 && staticClass && !isRoot) {
    return { name: 'className', value: { kind: 'literal', value: staticClass } };
  }
  if (parts.length === 1) return { name: 'className', value: { kind: 'expr', code: parts[0]! } };
  return {
    name: 'className',
    value: { kind: 'expr', code: `[${parts.join(', ')}].filter(Boolean).join(' ')` },
  };
}

function classFromAttributes(attributes: Record<string, string> | undefined): string | undefined {
  if (!attributes) return undefined;
  for (const [name, value] of Object.entries(attributes)) {
    if (reactAttributeName(name) === 'className') return value;
  }
  return undefined;
}

function styleAttribute(
  node: Exclude<NestedNode, { type: 'instance' }>,
  bound: Bound,
  markStyle: () => void,
): Attr | undefined {
  if (!bound.style.length) {
    const raw = node.attributes?.style;
    if (!raw) return undefined;
    return { name: 'style', value: { kind: 'literal', value: raw } };
  }
  const needsCast = bound.style.some(([key]) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key));
  if (needsCast) markStyle();
  const body = bound.style
    .map(([key, expr]) => `${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quote(key)}: ${expr}`)
    .join(', ');
  const code = needsCast ? `{ ${body} } as CSSProperties` : `{ ${body} }`;
  return { name: 'style', value: { kind: 'expr', code } };
}

function staticAttrValue(name: string, value: string): Attr['value'] {
  if (isBooleanAttribute(name)) return { kind: 'bool', value: booleanAttributeValue(value) };
  const numeric = numericAttributeCode(name, value);
  if (numeric !== undefined) return { kind: 'expr', code: numeric };
  return { kind: 'literal', value };
}
