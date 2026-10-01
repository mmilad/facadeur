import {
  isVariantAxis,
  variantPresets,
  type DocumentFile,
  type DisplayOn,
  type EventBinding,
  type FieldValue,
  type NestedNode,
} from '@facadeur/core';
import {
  booleanAttributeValue,
  isBooleanAttribute,
  isEventAttribute,
  isVoidTag,
  numericAttributeCode,
  reactAttributeName,
  reactStyleName,
} from '../attributes.js';
import { CodegenError, propName, quote } from '../names.js';
import { assertDefault, jsLiteral } from './catalog.js';
import { childFieldValue, childFieldsForInstance, withChildFieldOverride } from './child-fields.js';
import type {
  Attr,
  Bound,
  CatalogEntry,
  ComponentImport,
  ElementNode,
  Expr,
  PropSpec,
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

function conditionForNode(
  condition: DisplayOn,
  owner: CatalogEntry,
  dataScope: ReadonlyMap<string, string>,
  usedProps: Set<string>,
): string {
  const value = dataExpression(condition.path, owner, dataScope, usedProps);
  if ('truthy' in condition) return condition.truthy ? value : `!${value}`;
  if ('equals' in condition) return `${value} === ${jsLiteral(condition.equals)}`;
  throw new CodegenError('Display condition is missing a predicate');
}

function dataExpression(
  path: string,
  owner: CatalogEntry,
  dataScope: ReadonlyMap<string, string>,
  usedProps: Set<string>,
): string {
  const [head, ...tail] = path.split('.');
  if (!head) throw new CodegenError(`Data path "${path}" is empty`);
  const scoped = dataScope.get(head);
  if (scoped) return `${scoped}${propertyAccess(tail)}`;
  const prop = owner.fields.get(head);
  if (!prop) {
    throw new CodegenError(
      `Data path "${path}" needs a field or repeat context on "${owner.document.id}"`,
    );
  }
  usedProps.add(prop.name);
  return `${prop.name}${propertyAccess(tail)}`;
}

function propertyAccess(parts: readonly string[]): string {
  return parts
    .map((part) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part) ? `?.${part}` : `?.[${quote(part)}]`))
    .join('');
}

function repeatLocalName(
  alias: string,
  owner: CatalogEntry,
  dataScope: ReadonlyMap<string, string>,
  usedProps: ReadonlySet<string>,
): string {
  const used = new Set<string>([
    ...usedProps,
    ...[...owner.fields.values()].map((prop) => prop.name),
    ...[...owner.variants.values()].map((prop) => prop.name),
    ...[...owner.events.values()].map((prop) => prop.name),
    ...dataScope.values(),
  ]);
  return propName(alias, used);
}

function renderInstance(
  node: Extract<NestedNode, { type: 'instance' }>,
  catalog: Map<string, CatalogEntry>,
  imports: Map<string, ComponentImport>,
  owner: CatalogEntry,
  usedProps: Set<string>,
  dataScope: ReadonlyMap<string, string>,
  childFieldsProp: string | undefined,
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
  const forwardedFields = new Set<string>();
  for (const [publicName, path] of Object.entries(owner.document.expose?.fields ?? {})) {
    const prefix = `${node.id}.`;
    if (!path.startsWith(prefix)) continue;
    const member = exposedMemberName(target, path.slice(prefix.length), 'field');
    const source = owner.fields.get(publicName);
    const destination = member ? target.fields.get(member) : undefined;
    if (!source || !destination) continue;
    forwardedFields.add(member!);
    usedProps.add(source.name);
    attrs.push({
      name: destination.name,
      value: withChildFieldOverride(
        { kind: 'expr', code: source.name },
        childFieldValue(childFieldsProp, node.id, member!),
        destination,
      ) ?? { kind: 'expr', code: source.name },
    });
  }
  for (const [publicName, path] of Object.entries(owner.document.expose?.events ?? {})) {
    const prefix = `${node.id}.`;
    if (!path.startsWith(prefix)) continue;
    const member = exposedMemberName(target, path.slice(prefix.length), 'event');
    const source = owner.events.get(publicName);
    const destination = member ? target.events.get(member) : undefined;
    if (!source || !destination) continue;
    usedProps.add(source.name);
    attrs.push({ name: destination.name, value: { kind: 'expr', code: source.name } });
  }
  const boundFields = new Set<string>();
  for (const [fieldName, path] of Object.entries(node.fieldBindings ?? {})) {
    const prop = target.fields.get(fieldName);
    if (!prop) {
      throw new CodegenError(
        `Instance "${node.id}" binds unknown field "${fieldName}" on "${node.component}"`,
      );
    }
    boundFields.add(fieldName);
    attrs.push({
      name: prop.name,
      value: { kind: 'expr', code: dataExpression(path, owner, dataScope, usedProps) },
    });
  }
  for (const [fieldName, value] of Object.entries(node.fields ?? {})) {
    if (forwardedFields.has(fieldName) || boundFields.has(fieldName)) {
      if (boundFields.has(fieldName)) {
        throw new CodegenError(
          `Instance "${node.id}" cannot set and bind field "${fieldName}" on "${node.component}" together`,
        );
      }
      continue;
    }
    const prop = target.fields.get(fieldName);
    if (!prop) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown field "${fieldName}" on "${node.component}"`,
      );
    }
    const directField = target.document.fields?.find((field) => field.name === fieldName);
    if (directField) assertDefault(node.component, directField, value);
    attrs.push({
      name: prop.name,
      value:
        withChildFieldOverride(
          valueAttr(prop.name, value).value,
          childFieldValue(childFieldsProp, node.id, fieldName),
          prop,
        ) ?? valueAttr(prop.name, value).value,
    });
  }
  const providedFields = new Set([
    ...forwardedFields,
    ...boundFields,
    ...Object.keys(node.fields ?? {}),
  ]);
  for (const [fieldName, prop] of target.fields) {
    if (prop.required && !providedFields.has(fieldName)) {
      throw new CodegenError(
        `Instance "${node.id}" is missing required field "${fieldName}" on "${node.component}"`,
      );
    }
    if (!providedFields.has(fieldName) && !prop.required) {
      const override = childFieldValue(childFieldsProp, node.id, fieldName);
      const value = withChildFieldOverride(undefined, override, prop);
      if (value) attrs.push({ name: prop.name, value });
    }
  }
  const inheritedChildFields = childFieldsForInstance(childFieldsProp, node.id, node.childFields);
  if (inheritedChildFields && target.childFieldsProp) {
    attrs.push({
      name: target.childFieldsProp,
      value: { kind: 'expr', code: inheritedChildFields },
    });
  }
  for (const axis of (target.document.variants ?? []).filter(isVariantAxis)) {
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
  if (target.namedVariant) {
    const value = node.variants?.variant;
    if (value !== undefined) {
      const presets = variantPresets(target.document);
      if (!presets.some((preset) => preset.name === value)) {
        throw new CodegenError(
          `Instance "${node.id}" uses "${value}" for variant on "${node.component}", expected ${presets.map((preset) => preset.name).join(', ')}`,
        );
      }
      attrs.push({ name: target.namedVariant.name, value: { kind: 'literal', value } });
    } else if (node.variantRules?.length) {
      attrs.push({
        name: target.namedVariant.name,
        value: {
          kind: 'expr',
          code: variantRuleExpression(node.variantRules, owner, dataScope, usedProps),
        },
      });
    }
  } else if (node.variantRules?.length) {
    throw new CodegenError(
      `Instance "${node.id}" uses variant rules but "${node.component}" has no named variants`,
    );
  }
  for (const name of Object.keys(node.variants ?? {})) {
    if (name === 'variant' && target.namedVariant) continue;
    if (!target.variants.has(name)) {
      throw new CodegenError(
        `Instance "${node.id}" sets unknown variant "${name}" on "${node.component}"`,
      );
    }
  }
  return {
    tag: target.component,
    attrs,
    children: [],
    void: true,
    ...(node.displayOn
      ? { condition: conditionForNode(node.displayOn, owner, dataScope, usedProps) }
      : {}),
  };
}

function variantRuleExpression(
  rules: readonly { when: DisplayOn; variant: string }[],
  owner: CatalogEntry,
  dataScope: ReadonlyMap<string, string>,
  usedProps: Set<string>,
): string {
  let expression = quote('default');
  for (let index = rules.length - 1; index >= 0; index -= 1) {
    const rule = rules[index];
    if (!rule) continue;
    const condition = conditionForNode(rule.when, owner, dataScope, usedProps);
    expression = `${condition} ? ${quote(rule.variant)} : ${expression}`;
  }
  return expression;
}

function exposedMemberName(
  target: CatalogEntry,
  path: string,
  kind: 'field' | 'event',
): string | undefined {
  const members = kind === 'field' ? target.fields : target.events;
  if (members.has(path)) return path;
  const mappings =
    kind === 'field' ? target.document.expose?.fields : target.document.expose?.events;
  return Object.entries(mappings ?? {}).find(([, mappedPath]) => mappedPath === path)?.[0];
}

function valueAttr(name: string, value: FieldValue): Attr {
  if (typeof value === 'string') return { name, value: { kind: 'literal', value } };
  if (typeof value === 'boolean') return { name, value: { kind: 'bool', value } };
  return { name, value: { kind: 'expr', code: jsLiteral(value) } };
}

function eventAttributes(
  bindings: EventBinding[] | undefined,
  owner: CatalogEntry,
  usedProps: Set<string>,
): Attr[] {
  const attrs: Attr[] = [];
  for (const binding of bindings ?? []) {
    const event = owner.events.get(binding.event);
    if (!event) {
      throw new CodegenError(`Unknown event "${binding.event}" on "${owner.document.id}"`);
    }
    usedProps.add(event.name);
    const nativeName = binding.name.startsWith('on')
      ? binding.name
      : `on${binding.name.charAt(0).toUpperCase()}${binding.name.slice(1)}`;
    const payload = event.eventPayload ?? {};
    const explicitPayload = (binding as EventBindingWithPayload).payload;
    for (const key of Object.keys(explicitPayload ?? {})) {
      if (!(key in payload)) {
        throw new CodegenError(
          `Event binding for "${binding.event}" maps unknown payload key "${key}"`,
        );
      }
    }
    const structured = Object.entries(payload).find(
      ([, type]) => type === 'array' || type === 'object',
    );
    if (structured) {
      throw new CodegenError(
        `Event "${binding.event}" has a structured payload field "${structured[0]}" and cannot be mapped from native event "${binding.name}"`,
      );
    }
    if (!Object.keys(payload).length) {
      attrs.push({
        name: nativeName,
        value: { kind: 'expr', code: `() => ${event.name}?.()` },
      });
      continue;
    }
    const entries = Object.entries(payload).map(([key, type]) => {
      const source =
        explicitPayload?.[key] ??
        (type === 'boolean' ? 'checked' : type === 'number' ? 'valueAsNumber' : 'value');
      assertPayloadSource(source, type, binding.event, key);
      const value = explicitPayload?.[key]
        ? payloadSourceExpression(source)
        : defaultPayloadExpression(type);
      return `${key}: ${value}`;
    });
    attrs.push({
      name: nativeName,
      value: {
        kind: 'expr',
        code: `(event) => ${event.name}?.({ ${entries.join(', ')} })`,
      },
    });
  }
  return attrs;
}

type EventPayloadSource = 'value' | 'checked' | 'valueAsNumber';
type EventBindingWithPayload = EventBinding & {
  payload?: Record<string, EventPayloadSource>;
};

function assertPayloadSource(
  source: EventPayloadSource,
  type: string,
  eventName: string,
  key: string,
): void {
  if (source === 'checked' && type !== 'boolean') {
    throw new CodegenError(
      `Event "${eventName}" payload "${key}" uses checked but its type is ${type}`,
    );
  }
  if (source === 'valueAsNumber' && type !== 'number') {
    throw new CodegenError(
      `Event "${eventName}" payload "${key}" uses valueAsNumber but its type is ${type}`,
    );
  }
}

function payloadSourceExpression(source: EventPayloadSource): string {
  switch (source) {
    case 'checked':
      return 'event.currentTarget.checked';
    case 'valueAsNumber':
      return 'event.currentTarget.valueAsNumber';
    default:
      return 'event.currentTarget.value';
  }
}

function defaultPayloadExpression(type: string): string {
  if (type === 'boolean') return 'event.currentTarget.checked';
  if (type === 'number') return 'Number(event.currentTarget.value)';
  return 'event.currentTarget.value';
}

function applyBinding(
  bound: Bound,
  binding: { field: string; target: string; name?: string },
  prop: PropSpec,
  expr: Expr,
): boolean {
  if (prop.fieldType === 'array' || prop.fieldType === 'object') {
    throw new CodegenError(
      `Binding "${binding.field}" on "${binding.target}" cannot use structured field type "${prop.fieldType}"`,
    );
  }
  if (binding.target === 'visible' && prop.fieldType !== 'boolean') {
    throw new CodegenError(`Binding "${binding.field}" targeting visible needs a boolean field`);
  }
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
    } else bound.attrs.set(reactName, { kind: 'expr', code: attributeExpr(prop) });
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

function attributeExpr(prop: PropSpec): string {
  return prop.fieldType === 'boolean' ? `String(${prop.name})` : prop.name;
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

function isJsxName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(name);
}

function jsxText(value: string): string {
  if (value === '') return '{``}';
  if (/[{}<>&]/.test(value) || /^\s|\s$/.test(value) || value.includes('\n')) {
    return `{${quote(value)}}`;
  }
  return value;
}
