import type { FlatDocument } from '../../../document/flat';
import type { StyleBlock, StyleLayer } from '../../../schema/document';
import { layoutTokenRefs } from '../layout';
import { UUID_PATTERN } from '../../../document/ids';

const UUID_SOURCE = UUID_PATTERN.source.slice(1, -1);
const TOKEN_REF = new RegExp(`\\{token:(${UUID_SOURCE})\\}`, 'gi');

/** Every stable token UUID referenced by the style block, layout, or typography. */
export function collectTokenRefs(doc: Pick<FlatDocument, 'styles' | 'nodes' | 'variantPresets'>) {
  const refs = new Set<string>();
  if (doc.styles) collectBlockRefs(doc.styles, refs);
  for (const preset of doc.variantPresets ?? []) {
    if (preset.overrides?.styles) collectBlockRefs(preset.overrides.styles, refs);
  }
  for (const node of Object.values(doc.nodes)) {
    if (node.type === 'instance') {
      for (const ref of layoutTokenRefs(node.layout)) refs.add(ref);
      continue;
    }
    for (const ref of layoutTokenRefs(node.layout)) refs.add(ref);
    for (const value of Object.values(node.style ?? {})) {
      for (const ref of refsInText(value)) refs.add(ref);
    }
  }
  return [...refs].sort();
}

function collectBlockRefs(block: StyleBlock, refs: Set<string>) {
  collectLayerRefs(block, refs);
  for (const layer of Object.values(block.variants ?? {})) {
    for (const variant of Object.values(layer)) collectLayerRefs(variant, refs);
  }
  for (const layer of Object.values(block.breakpoints ?? {})) collectLayerRefs(layer, refs);
  for (const rule of block.rules ?? []) {
    collectLayerRefs(rule, refs);
    for (const layer of Object.values(rule.variants ?? {})) {
      for (const variant of Object.values(layer)) collectLayerRefs(variant, refs);
    }
    for (const layer of Object.values(rule.breakpoints ?? {})) collectLayerRefs(layer, refs);
  }
  for (const child of Object.values(block.children ?? {})) {
    collectLayerRefs(child, refs);
    for (const layer of Object.values(child.variants ?? {})) {
      for (const variant of Object.values(layer)) collectLayerRefs(variant, refs);
    }
    for (const layer of Object.values(child.breakpoints ?? {})) collectLayerRefs(layer, refs);
  }
}

function collectLayerRefs(layer: StyleLayer, refs: Set<string>) {
  for (const value of Object.values(layer.declarations ?? {})) {
    for (const ref of refsInText(value)) refs.add(ref);
  }
  for (const state of Object.values(layer.states ?? {})) {
    for (const value of Object.values(state ?? {})) {
      for (const ref of refsInText(value)) refs.add(ref);
    }
  }
}

/** Collect UUIDs from canonical `{token:uuid}` references embedded in CSS values. */
export function refsInText(value: string): string[] {
  const refs: string[] = [];
  for (const match of value.matchAll(TOKEN_REF)) {
    const uuid = match[1];
    if (uuid) refs.push(uuid);
  }
  return refs;
}
