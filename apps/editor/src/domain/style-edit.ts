import type { StyleBlock, StyleChild, StyleDeclarations, StyleLayer } from '@facadeur/core';

export const styleStateNames = ['hover', 'focus-visible', 'disabled'] as const;
export type StyleStateName = (typeof styleStateNames)[number];

/** A declarations map inside the style block. The root node is the block itself. */
export interface StyleEditTarget {
  nodeId: string;
  axis?: string;
  value?: string;
  state?: StyleStateName;
  /**
   * Non-base breakpoint. Writes `breakpoints[id]` on the style owner.
   * Ignored when `axis` is set: variants are not nested under breakpoints.
   */
  breakpointId?: string;
}

export interface ShownDeclaration {
  property: string;
  /** Value in the field. Viewport mode prefers the override, then the base. */
  value: string;
  /** True when the active viewport stores its own value for this property. */
  overridden: boolean;
}

/**
 * Base keys first, then properties that exist only on the viewport override,
 * so a breakpoint-only value stays visible and resettable from Base.
 */
export function shownDeclarations(
  base: StyleDeclarations,
  override: StyleDeclarations,
  writingViewport: boolean,
): ShownDeclaration[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const key of Object.keys(base)) {
    seen.add(key);
    keys.push(key);
  }
  for (const key of Object.keys(override)) {
    if (seen.has(key)) continue;
    keys.push(key);
  }
  return keys.map((property) => {
    const overridden = Object.prototype.hasOwnProperty.call(override, property);
    const value = writingViewport
      ? (override[property] ?? base[property] ?? '')
      : (base[property] ?? '');
    return { property, value, overridden };
  });
}

export function readStyleDeclarations(
  block: StyleBlock | undefined,
  rootId: string,
  target: StyleEditTarget,
): StyleDeclarations {
  const layer = findLayer(block, rootId, target);
  if (!layer) return {};
  if (target.state) return { ...(layer.states?.[target.state] ?? {}) };
  return { ...(layer.declarations ?? {}) };
}

/**
 * Set or clear one declaration. Empty layers are removed.
 * `null` means the style block itself is gone.
 */
export function writeStyleDeclaration(
  block: StyleBlock | undefined,
  rootId: string,
  target: StyleEditTarget,
  property: string,
  value: string | null,
): StyleBlock | null {
  const next: StyleBlock = block ? structuredClone(block) : {};
  const layer = ensureLayer(next, rootId, target);
  if (target.state) {
    const states = (layer.states ??= {});
    const declarations = (states[target.state] ??= {});
    if (value === null) delete declarations[property];
    else declarations[property] = value;
  } else {
    const declarations = (layer.declarations ??= {});
    if (value === null) delete declarations[property];
    else declarations[property] = value;
  }
  compactBlock(next);
  return hasContent(next) ? next : null;
}

function findLayer(
  block: StyleBlock | undefined,
  rootId: string,
  target: StyleEditTarget,
): StyleLayer | undefined {
  if (!block) return undefined;
  const owner = ownerOf(block, rootId, target.nodeId, false);
  if (!owner) return undefined;
  if (usesBreakpoint(target)) return owner.breakpoints?.[target.breakpointId ?? ''];
  if (target.axis && target.value !== undefined) {
    return owner.variants?.[target.axis]?.[target.value];
  }
  return owner;
}

function ensureLayer(block: StyleBlock, rootId: string, target: StyleEditTarget): StyleLayer {
  const owner = ownerOf(block, rootId, target.nodeId, true);
  if (!owner) return block;
  if (usesBreakpoint(target)) {
    const breakpointId = target.breakpointId ?? '';
    const breakpoints = (owner.breakpoints ??= {});
    return (breakpoints[breakpointId] ??= {});
  }
  if (!target.axis || target.value === undefined) return owner;
  const variants = (owner.variants ??= {});
  const values = (variants[target.axis] ??= {});
  return (values[target.value] ??= {});
}

/** Breakpoint layers live on the owner. A variant target stays on that variant. */
function usesBreakpoint(target: StyleEditTarget): boolean {
  return Boolean(target.breakpointId) && !(target.axis && target.value !== undefined);
}

function ownerOf(
  block: StyleBlock,
  rootId: string,
  nodeId: string,
  create: boolean,
): StyleChild | undefined {
  if (nodeId === rootId) return block;
  if (!create) return block.children?.[nodeId];
  const children = (block.children ??= {});
  return (children[nodeId] ??= {});
}

function compactBlock(block: StyleBlock): void {
  compactOwner(block);
  if (!block.children) return;
  for (const id of Object.keys(block.children)) {
    const child = block.children[id];
    if (!child || compactOwner(child)) delete block.children[id];
  }
  if (!Object.keys(block.children).length) delete block.children;
}

function compactOwner(owner: StyleChild): boolean {
  compactLayer(owner);
  compactBreakpoints(owner);
  if (owner.variants) {
    for (const axis of Object.keys(owner.variants)) {
      const values = owner.variants[axis];
      if (!values) continue;
      for (const value of Object.keys(values)) {
        const layer = values[value];
        if (!layer || compactLayer(layer)) delete values[value];
      }
      if (!Object.keys(values).length) delete owner.variants[axis];
    }
    if (!Object.keys(owner.variants).length) delete owner.variants;
  }
  return !owner.declarations && !owner.states && !owner.variants && !owner.breakpoints;
}

function compactBreakpoints(owner: StyleChild): void {
  if (!owner.breakpoints) return;
  for (const id of Object.keys(owner.breakpoints)) {
    const layer = owner.breakpoints[id];
    if (!layer || compactLayer(layer)) delete owner.breakpoints[id];
  }
  if (!Object.keys(owner.breakpoints).length) delete owner.breakpoints;
}

function compactLayer(layer: StyleLayer): boolean {
  if (layer.declarations && !Object.keys(layer.declarations).length) delete layer.declarations;
  if (layer.states) {
    for (const name of styleStateNames) {
      const declarations = layer.states[name];
      if (declarations && !Object.keys(declarations).length) delete layer.states[name];
    }
    if (!Object.keys(layer.states).length) delete layer.states;
  }
  return !layer.declarations && !layer.states;
}

function hasContent(block: StyleBlock): boolean {
  return Boolean(
    block.declarations || block.states || block.variants || block.breakpoints || block.children,
  );
}
