import type { FlatDocument } from '../../../document/flat.js';
import type { StyleBlock, StyleLayer } from '../../../document/schema.js';
import { componentTokenPublicPath } from '../tokens/component/contract.js';

const TOKEN_REF = /\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}/g;

function rewriteRefString(value: string, oldPath: string, newPath: string) {
  if (!value.includes('{')) return value;
  return value.replace(TOKEN_REF, (match, path: string) => {
    if (path === oldPath) return `{${newPath}}`;
    return match;
  });
}

function rewriteLayer(layer: StyleLayer, oldPath: string, newPath: string) {
  if (layer.declarations) {
    for (const [key, value] of Object.entries(layer.declarations)) {
      layer.declarations[key] = rewriteRefString(value, oldPath, newPath);
    }
  }
  if (layer.states) {
    for (const declarations of Object.values(layer.states)) {
      if (!declarations) continue;
      for (const [key, value] of Object.entries(declarations)) {
        declarations[key] = rewriteRefString(value, oldPath, newPath);
      }
    }
  }
}

function rewriteStyleBlock(block: StyleBlock, oldPath: string, newPath: string) {
  rewriteLayer(block, oldPath, newPath);
  for (const layer of Object.values(block.variants ?? {})) {
    for (const variant of Object.values(layer)) rewriteLayer(variant, oldPath, newPath);
  }
  for (const layer of Object.values(block.breakpoints ?? {})) rewriteLayer(layer, oldPath, newPath);
  for (const child of Object.values(block.children ?? {})) {
    rewriteLayer(child, oldPath, newPath);
    for (const layer of Object.values(child.variants ?? {})) {
      for (const variant of Object.values(layer)) rewriteLayer(variant, oldPath, newPath);
    }
    for (const layer of Object.values(child.breakpoints ?? {}))
      rewriteLayer(layer, oldPath, newPath);
  }
}

/** Rewrites `{oldPath}` to `{newPath}` across styles, nodes, presets, and tokenInterface sets. */
export function rewriteLocalComponentTokenPath(
  doc: FlatDocument,
  oldPath: string,
  newPath: string,
) {
  if (doc.styles) rewriteStyleBlock(doc.styles, oldPath, newPath);
  for (const preset of doc.variantPresets ?? []) {
    if (preset.overrides?.styles) rewriteStyleBlock(preset.overrides.styles, oldPath, newPath);
  }
  for (const node of Object.values(doc.nodes)) {
    if (node.type === 'instance' || !node.style) continue;
    for (const [key, value] of Object.entries(node.style)) {
      if (typeof value === 'string') node.style[key] = rewriteRefString(value, oldPath, newPath);
    }
  }
  const sets = doc.tokenInterface?.sets;
  if (sets) {
    const publicOld = componentTokenPublicPath(doc.id, oldPath);
    const publicNew = componentTokenPublicPath(doc.id, newPath);
    if (sets[publicOld] !== undefined) {
      sets[publicNew] = sets[publicOld];
      delete sets[publicOld];
    }
    for (const [key, value] of Object.entries(sets)) {
      sets[key] = rewriteRefString(value, oldPath, newPath);
    }
  }
}
