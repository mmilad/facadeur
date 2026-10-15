import type { StyleBlock, StyleLayer } from '../../../schema/document';
import { parseStyleBlock } from './parse';

/** Drop one variant axis from the style block. */
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
  return next;
}

function pruneVariantMap(
  variants: StyleBlock['variants'] | undefined,
  axis: string,
  keepValues: ReadonlySet<string> | null,
) {
  if (!variants) return undefined;
  const next: NonNullable<StyleBlock['variants']> = {};
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

function styleHasContent(style: StyleBlock) {
  return Boolean(
    style.declarations ||
    style.states ||
    style.variants ||
    style.breakpoints ||
    style.rules?.length,
  );
}
