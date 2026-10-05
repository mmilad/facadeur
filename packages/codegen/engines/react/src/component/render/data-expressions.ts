import type { DisplayOn } from '@facadeur/core';
import { CodegenError, propName, quote } from '../../names';
import { jsLiteral } from '../catalog';
import type { CatalogEntry } from '../types';

export function conditionForNode(
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

export function dataExpression(
  path: string,
  owner: CatalogEntry,
  dataScope: ReadonlyMap<string, string>,
  usedProps: Set<string>,
): string {
  const [head, ...tail] = path.split('.');
  if (!head) throw new CodegenError(`Data path "${path}" is empty`);
  const scoped = dataScope.get(head);
  if (scoped) {
    if (/\bcontext\b/.test(scoped)) usedProps.add('$context');
    if (head === 'props' && dataScope.has('$effectiveProps')) {
      if (tail.length === 0) {
        const fields = [...owner.fields.values()];
        fields.forEach((field) => usedProps.add(field.name));
        return `{ ${fields.map((field) => `${quote(field.source)}: ${field.name}`).join(', ')} }`;
      }
      const [fieldName, ...nested] = tail;
      const field = fieldName ? owner.fields.get(fieldName) : undefined;
      if (!field) {
        throw new CodegenError(
          `Data path "${path}" needs a field or repeat context on "${owner.document.id}"`,
        );
      }
      usedProps.add(field.name);
      return `${field.name}${propertyAccess(nested)}`;
    }
    return `${scoped}${propertyAccess(tail)}`;
  }
  const prop = owner.fields.get(head);
  if (!prop) {
    throw new CodegenError(
      `Data path "${path}" needs a field or repeat context on "${owner.document.id}"`,
    );
  }
  usedProps.add(prop.name);
  return `${prop.name}${propertyAccess(tail)}`;
}

export function repeatLocalName(
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

export function repeatedDataScope(
  dataScope: ReadonlyMap<string, string>,
  alias: string,
  item: string,
  index: string,
): Map<string, string> {
  const parentScope = dataScope.get('$repeatScope') ?? 'undefined';
  const parent = `(${parentScope} as any)`;
  return new Map(dataScope)
    .set(alias, item)
    .set('item', item)
    .set('index', index)
    .set('parent', parent)
    .set('$repeatScope', `{ item: ${item}, index: ${index}, parent: ${parentScope} }`);
}

export function variantRuleExpression(
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

function propertyAccess(parts: readonly string[]): string {
  return parts
    .map((part) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part) ? `?.${part}` : `?.[${quote(part)}]`))
    .join('');
}
