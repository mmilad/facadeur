import type { FlatDocument } from '../../../document/flat.js';
import type { StyleBlock, StyleLayer } from '../../../schema/document.js';
import { layoutTokenRefs } from '../layout.js';

const TOKEN_REF = /\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}/g;

/** Every DTCG path referenced by the style block and layout. Font-family refs are omitted. */
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

/** `{font.sans}` names a family. Any other reference is a token. */
export function refsInText(value: string): string[] {
  const refs: string[] = [];
  for (const match of value.matchAll(TOKEN_REF)) {
    const path = match[1];
    if (!path || isFontFamilyRef(path)) continue;
    refs.push(path);
  }
  return refs;
}

export function isFontFamilyRef(path: string): boolean {
  const parts = path.split('.');
  return parts.length === 2 && parts[0] === 'font';
}
