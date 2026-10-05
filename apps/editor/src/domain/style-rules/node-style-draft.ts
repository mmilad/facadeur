import type { FlatDocument, StyleBlock, StyleChild } from '@facadeur/core';
import type { StyleBreakpointRef, StyleEditTarget } from '../edits/style-edit.js';
import { canonicalStyleProperty } from '../edits/style-edit.js';

/** Return the class rule's effective declarations in the selected state/viewport context. */
export function readNodeStyleDraft(
  document: FlatDocument,
  nodeId: string,
  target: Omit<StyleEditTarget, 'axis' | 'value' | 'variantName'>,
  breakpoints: readonly StyleBreakpointRef[],
): Record<string, string> {
  return resolveNodeDeclarations(document, nodeId, target, breakpoints, false);
}

/** Read the declarations that remain when the selected sparse layer is reset. */
export function readNodeStyleFallback(
  document: FlatDocument,
  nodeId: string,
  target: Omit<StyleEditTarget, 'axis' | 'value' | 'variantName'>,
  breakpoints: readonly StyleBreakpointRef[],
): Record<string, string> {
  return resolveNodeDeclarations(document, nodeId, target, breakpoints, true);
}

export function readOwnNodeStyleLayer(
  block: StyleBlock | undefined,
  rootId: string,
  nodeId: string,
  target: Pick<StyleEditTarget, 'state' | 'breakpointId'>,
): Record<string, string> {
  const owner: StyleChild | undefined = nodeId === rootId ? block : block?.children?.[nodeId];
  const layer = target.breakpointId ? owner?.breakpoints?.[target.breakpointId] : owner;
  const values = target.state ? layer?.states?.[target.state] : layer?.declarations;
  return structuredClone(values ?? {});
}

function resolveNodeDeclarations(
  document: FlatDocument,
  nodeId: string,
  target: Pick<StyleEditTarget, 'state' | 'breakpointId'>,
  breakpoints: readonly StyleBreakpointRef[],
  omitTargetLayer: boolean,
): Record<string, string> {
  const node = document.nodes[nodeId];
  if (node?.type === 'repeater' || node?.type === 'switch') return {};
  const block = document.styles;
  const owner: StyleChild | undefined =
    nodeId === document.rootId ? block : block?.children?.[nodeId];
  const ordered = [...breakpoints].sort((left, right) => left.minWidth - right.minWidth);
  const focus = target.breakpointId
    ? ordered.find((item) => item.id === target.breakpointId)
    : undefined;
  const maxWidth = focus?.minWidth;
  const layers: { id: string | null; layer: StyleChild }[] = owner
    ? [{ id: null, layer: owner }]
    : [];
  if (target.breakpointId && owner) {
    for (const breakpoint of ordered) {
      if (maxWidth !== undefined && breakpoint.minWidth > maxWidth) break;
      const layer = owner.breakpoints?.[breakpoint.id];
      if (layer) layers.push({ id: breakpoint.id, layer });
    }
    if (!focus && !ordered.some((item) => item.id === target.breakpointId)) {
      const layer = owner.breakpoints?.[target.breakpointId];
      if (layer) layers.push({ id: target.breakpointId, layer });
    }
  }

  const declarations: Record<string, string> = {};
  let mergedInline = false;
  for (const { id, layer } of layers) {
    if (!(omitTargetLayer && !target.state && id === target.breakpointId)) {
      merge(declarations, layer.declarations);
    }
    if (id === null) {
      const inline = node && 'style' in node ? node.style : undefined;
      merge(declarations, inline);
      mergedInline = true;
    }
  }
  if (!mergedInline) {
    const inline = node && 'style' in node ? node.style : undefined;
    merge(declarations, inline);
  }
  if (target.state) {
    for (const { id, layer } of layers) {
      if (omitTargetLayer && id === (target.breakpointId ?? null)) continue;
      merge(declarations, layer.states?.[target.state]);
    }
  }
  return declarations;
}

function merge(target: Record<string, string>, source: Record<string, string> | undefined): void {
  for (const [property, value] of Object.entries(source ?? {})) {
    const canonical = canonicalStyleProperty(property);
    for (const existing of Object.keys(target)) {
      if (canonicalStyleProperty(existing) === canonical) delete target[existing];
    }
    target[canonical] = value;
  }
}
