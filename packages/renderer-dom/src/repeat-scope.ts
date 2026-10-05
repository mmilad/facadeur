import type { FieldValue } from '@facadeur/core';

export type RepeatScope = Record<string, FieldValue> & {
  item: FieldValue;
  index: number;
  parent?: RepeatScope;
};

export function repeatedDataScope(
  scope: Record<string, FieldValue>,
  item: FieldValue,
  index: number,
  alias: string,
  parent?: RepeatScope,
): { scope: Record<string, FieldValue>; repeatScope: RepeatScope } {
  const repeatScope: RepeatScope = {
    item,
    index,
    ...(parent ? { parent } : {}),
  };
  const dataScope: Record<string, FieldValue> = {
    ...scope,
    [alias]: item,
    item,
    index,
    ...(parent ? { parent } : {}),
  };
  if (!parent) delete dataScope.parent;
  return {
    scope: dataScope,
    repeatScope,
  };
}

export function scopeForInstance(
  scope: Record<string, FieldValue>,
  parent?: RepeatScope,
  contextualProps?: FieldValue,
): Record<string, FieldValue> {
  const result = { ...scope };
  if (contextualProps !== undefined) result.props = contextualProps;
  if (!parent) return result;
  delete result.parent;
  return {
    ...result,
    item: parent.item,
    index: parent.index,
    ...(parent.parent ? { parent: parent.parent } : {}),
  };
}

export function scopeWithStructuralProps(
  scope: Record<string, FieldValue>,
  props: FieldValue,
  currentItem?: FieldValue,
  legacy = false,
): Record<string, FieldValue> {
  const resolved: Record<string, FieldValue> = {
    ...scope,
    ...(legacy && typeof props === 'object' && props !== null && !Array.isArray(props)
      ? props
      : {}),
    props,
  };
  for (const key of ['item', 'index', 'parent'] as const) {
    if (Object.hasOwn(scope, key)) resolved[key] = scope[key]!;
    else delete resolved[key];
  }
  if (currentItem !== undefined) resolved.item = currentItem;
  return resolved;
}
