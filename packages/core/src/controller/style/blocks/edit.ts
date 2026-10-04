import { isPlainObject as isRecord } from '../../../document/json.js';
import type { StyleBlock, StyleChild, StyleLayer } from '../../../document/schema.js';
import { parseStyleBlock } from './parse.js';

/** Drop style rules targeting removed local node ids and their nested paths. */
export function pruneStyleBlockNodes(
  style: StyleBlock | undefined,
  removedIds: ReadonlySet<string>,
  localInstanceIds?: ReadonlySet<string>,
) {
  if (!style) return style;
  let changed = false;
  const children = { ...(style.children ?? {}) };
  for (const id of removedIds) {
    for (const target of Object.keys(children)) {
      if (target === id || target.startsWith(`${id}/`)) {
        delete children[target];
        changed = true;
      }
    }
  }
  if (localInstanceIds) {
    for (const target of Object.keys(children)) {
      const localPath = target.split('/');
      const boundary = localPath.findIndex((segment) => localInstanceIds.has(segment));
      const ownerPath = boundary < 0 ? localPath : localPath.slice(0, boundary + 1);
      if (ownerPath.some((segment) => removedIds.has(segment))) {
        delete children[target];
        changed = true;
      }
    }
  }
  const rules = style.rules?.filter((rule) =>
    Object.values(rule.bindings).every((nodeId) => !removedIds.has(nodeId)),
  );
  if (rules?.length !== style.rules?.length) changed = true;
  if (!changed) return style;
  const result: StyleBlock = { ...style };
  if (Object.keys(children).length) result.children = children;
  else delete result.children;
  if (rules?.length) result.rules = rules;
  else delete result.rules;
  if (!styleHasContent(result)) return undefined;
  return result;
}

/** Rebase nested rendered-path keys after an owner-local subtree moves. */
export function rebaseStyleBlockChildPaths(
  style: StyleBlock | undefined,
  fromPath: string,
  toPath: string,
) {
  if (!style?.children || fromPath === toPath) return style;
  const children = { ...style.children };
  const moved: [string, StyleChild][] = [];
  for (const [target, rule] of Object.entries(children)) {
    if (!target.includes('/') || (target !== fromPath && !target.startsWith(`${fromPath}/`))) {
      continue;
    }
    delete children[target];
    moved.push([`${toPath}${target.slice(fromPath.length)}`, rule]);
  }
  if (!moved.length) return style;
  for (const [target, rule] of moved) {
    children[target] = children[target] ? mergeSparseRecord(children[target], rule) : rule;
  }
  return { ...style, children };
}

function mergeSparseRecord<T extends object>(target: T, source: T): T {
  const next = structuredClone(target) as Record<string, unknown>;
  for (const [key, value] of Object.entries(source)) {
    const previous = next[key];
    next[key] = isRecord(previous) && isRecord(value) ? mergeSparseRecord(previous, value) : value;
  }
  return next as T;
}

/** Drop one variant axis from the style block, including child rules. */
export function omitVariantAxis(style: StyleBlock, axis: string) {
  return finishPrune(pruneStyle(style, axis, null));
}

/** Drop variant values that are no longer on the axis. `keep` contains values that remain. */
export function omitVariantValues(style: StyleBlock, axis: string, keep: ReadonlySet<string>) {
  return finishPrune(pruneStyle(style, axis, keep));
}

function finishPrune(style: StyleBlock) {
  if (!styleHasContent(style)) return undefined;
  return parseStyleBlock(style);
}

function pruneStyle(style: StyleBlock, axis: string, keepValues: ReadonlySet<string> | null) {
  const next = structuredClone(style);
  for (const rule of next.rules ?? []) {
    const ruleVariants = pruneVariantMap(rule.variants, axis, keepValues);
    if (ruleVariants) rule.variants = ruleVariants;
    else delete rule.variants;
  }
  const variants = pruneVariantMap(next.variants, axis, keepValues);
  if (variants) next.variants = variants;
  else delete next.variants;
  if (next.children) {
    for (const id of Object.keys(next.children)) {
      const child = next.children[id];
      if (!child) continue;
      const childVariants = pruneVariantMap(child.variants, axis, keepValues);
      if (childVariants) child.variants = childVariants;
      else delete child.variants;
      if (!styleHasContent(child)) delete next.children[id];
    }
    if (!Object.keys(next.children).length) delete next.children;
  }
  return next;
}

function pruneVariantMap(
  variants: StyleChild['variants'] | undefined,
  axis: string,
  keepValues: ReadonlySet<string> | null,
) {
  if (!variants) return undefined;
  const next: NonNullable<StyleChild['variants']> = {};
  for (const [name, values] of Object.entries(variants)) {
    if (name === axis && keepValues === null) continue;
    const kept: Record<string, StyleLayer> = {};
    for (const [value, layer] of Object.entries(values)) {
      if (name === axis && keepValues && !keepValues.has(value)) continue;
      kept[value] = layer;
    }
    if (Object.keys(kept).length) next[name] = kept;
  }
  return Object.keys(next).length ? next : undefined;
}

function styleHasContent(style: StyleBlock | StyleChild) {
  const children = 'children' in style ? style.children : undefined;
  return Boolean(
    style.declarations ||
    style.states ||
    style.variants ||
    style.breakpoints ||
    children ||
    ('rules' in style && style.rules?.length),
  );
}
