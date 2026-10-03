import {
  isBooleanAttribute,
  isEventAttribute,
  reactAttributeName,
  reactStyleName,
} from '../../attributes';
import { CodegenError } from '../../names';
import { isJsxName } from './jsx-text';
import type { Bound, CatalogEntry, Expr, PropSpec } from '../types';

export function bindingsFor(
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
