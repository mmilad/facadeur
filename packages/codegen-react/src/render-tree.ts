import type { DocumentFile, FieldValue, NestedNode } from '@facadeur/core';
import {
  booleanAttributeValue,
  isBooleanAttribute,
  isEventAttribute,
  isVoidTag,
  numericAttributeCode,
  reactAttributeName,
  reactStyleName,
} from './attributes.js';
import { assertDefault, variantTypeSpecs } from './catalog.js';
import type {
  Attr,
  Bound,
  CatalogEntry,
  ComponentFile,
  ComponentImport,
  ElementNode,
  Expr,
  PropSpec,
  TextChild,
} from './component-types.js';
import { jsLiteral, jsxText } from './jsx-literals.js';
import { CodegenError, quote } from './names.js';
import { printElement, printFile } from './print-component.js';

export function renderComponent(
  document: DocumentFile,
  catalog: Map<string, CatalogEntry>,
): ComponentFile {
  const entry = catalog.get(document.id);
  if (!entry) throw new CodegenError(`Missing catalog entry for "${document.id}"`);
  const variantTypes = variantTypeSpecs(document, entry);
  const imports = new Map<string, ComponentImport>();
  const usedProps = new Set<string>();
  let usesCssProperties = false;
  const root = renderNode(document, document.root, catalog, entry, true, imports, usedProps, () => {
    usesCssProperties = true;
  });
  const props = [...entry.fields.values(), ...entry.variants.values()];
  const contents = printFile({
    id: document.id,
    component: entry.component,
    props,
    variantTypes,
    imports: [...imports.values()].sort((left, right) => left.from.localeCompare(right.from, 'en')),
    usesCssProperties,
    usedProps,
    body: printElement(root, 2),
  });
  return {
    id: document.id,
    component: entry.component,
    path: `components/${entry.component}.tsx`,
    props,
    variantTypes,
    imports: [...imports.values()],
    usesCssProperties,
    contents,
  };
}

function renderNode(
  document: DocumentFile,
  node: NestedNode,
  catalog: Map<string, CatalogEntry>,
  owner: CatalogEntry,
  isRoot: boolean,
  imports: Map<string, ComponentImport>,
  usedProps: Set<string>,
  markStyle: () => void,
): ElementNode {
  if (node.type === 'instance') {
    return renderInstance(node, catalog, imports);
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
  const text = textChild(node, bound);
  if (text && !isVoidTag(tag)) childNodes.push({ text });
  if (!isVoidTag(tag)) {
    for (const child of children) {
      childNodes.push(
        renderNode(document, child, catalog, owner, false, imports, usedProps, markStyle),
      );
    }
  }

  return { tag, attrs, children: childNodes, void: isVoidTag(tag) };
}

function renderInstance(
  node: Extract<NestedNode, { type: 'instance' }>,
  catalog: Map<string, CatalogEntry>,
  imports: Map<string, ComponentImport>,
): ElementNode {
  const target = catalog.get(node.component);
  if (!target) {
    return {
      tag: 'div',
      void: false,
      attrs: [
        { name: 'data-node', value: { kind: 'literal', value: node.id } },
        { name: 'data-component', value: { kind: 'literal', value: node.component } },
        { name: 'className', value: { kind: 'literal', value: 'ds-unknown' } },
      ],
      children: [{ text: `Unknown component: ${jsxText(node.component)}` }],
    };
  }
  if (target.document.id !== node.component) {
    throw new CodegenError(`Catalog entry "${node.component}" does not match its document`);
  }
  imports.set(target.component, { name: target.component, from: `./${target.component}` });
  const attrs: Attr[] = [{ name: 'nodeId', value: { kind: 'literal', value: node.id } }];
  for (const field of target.document.fields ?? []) {
    const value = node.fields?.[field.name];
    if (value === undefined) continue;
    const prop = target.fields.get(field.name);
    if (!prop) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown field "${field.name}" on "${node.component}"`,
      );
    }
    assertDefault(node.component, field, value);
    attrs.push(valueAttr(prop.name, value));
  }
  for (const axis of target.document.variants ?? []) {
    const value = node.variants?.[axis.name];
    if (value === undefined) continue;
    const prop = target.variants.get(axis.name);
    if (!prop) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown variant "${axis.name}" on "${node.component}"`,
      );
    }
    if (!axis.values.includes(value)) {
      throw new CodegenError(
        `Instance "${node.id}" uses "${value}" for "${axis.name}", expected ${axis.values.join(', ')}`,
      );
    }
    attrs.push({ name: prop.name, value: { kind: 'literal', value } });
  }
  for (const name of Object.keys(node.fields ?? {})) {
    if (!target.fields.has(name)) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown field "${name}" on "${node.component}"`,
      );
    }
  }
  for (const name of Object.keys(node.variants ?? {})) {
    if (!target.variants.has(name)) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown variant "${name}" on "${node.component}"`,
      );
    }
  }
  return { tag: target.component, attrs, children: [], void: true };
}

function valueAttr(name: string, value: FieldValue): Attr {
  if (typeof value === 'string') return { name, value: { kind: 'literal', value } };
  if (typeof value === 'boolean') return { name, value: { kind: 'bool', value } };
  return { name, value: { kind: 'expr', code: jsLiteral(value) } };
}

function applyBinding(
  bound: Bound,
  binding: { field: string; target: string; name?: string },
  prop: PropSpec,
  expr: Expr,
): boolean {
  if (binding.target === 'text') {
    bound.text = expr;
    return true;
  }
  if (binding.target === 'attribute' && binding.name && !isEventAttribute(binding.name)) {
    const reactName = reactAttributeName(binding.name);
    if (!isJsxName(reactName)) {
      throw new CodegenError(`Binding attribute "${binding.name}" cannot be expressed in JSX`);
    }
    if (reactName === 'style') return false;
    if (reactName === 'className') bound.classExpr = stringExpr(prop);
    else if (isBooleanAttribute(reactName) && prop.fieldType === 'boolean') {
      bound.attrs.set(reactName, { kind: 'expr', code: prop.name });
    } else bound.attrs.set(reactName, { kind: 'expr', code: stringExpr(prop) });
    return true;
  }
  if (binding.target === 'style' && binding.name) {
    const key = reactStyleName(binding.name);
    bound.style = bound.style.filter(([name]) => name !== key);
    bound.style.push([key, stringExpr(prop)]);
    return true;
  }
  if (binding.target === 'src') {
    bound.src = { code: stringExpr(prop), fallback: prop.defaultExpr === undefined };
    return true;
  }
  if (binding.target === 'alt') {
    bound.alt = { code: stringExpr(prop), fallback: prop.defaultExpr === undefined };
    return true;
  }
  if (binding.target === 'visible') {
    bound.hidden = `${prop.name} === false`;
    return true;
  }
  return false;
}

function bindingsFor(
  bindings: { field: string; target: string; name?: string }[] | undefined,
  owner: CatalogEntry,
  usedProps: Set<string>,
): Bound {
  const bound: Bound = { attrs: new Map(), style: [] };
  for (const binding of bindings ?? []) {
    const prop = owner.fields.get(binding.field);
    if (!prop || prop.fieldType === 'variant') continue;
    const expr = expression(prop);
    const applied = applyBinding(bound, binding, prop, expr);
    if (applied) usedProps.add(prop.name);
  }
  return bound;
}

function expression(prop: PropSpec): Expr {
  return {
    code: prop.fieldType === 'boolean' ? `String(${prop.name})` : prop.name,
    fallback: prop.defaultExpr === undefined,
  };
}

function stringExpr(prop: PropSpec): string {
  if (prop.fieldType === 'boolean' || prop.fieldType === 'number') return `String(${prop.name})`;
  return prop.name;
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
  markStyle();
  const needsCast = bound.style.some(([key]) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key));
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

function isJsxName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(name);
}
