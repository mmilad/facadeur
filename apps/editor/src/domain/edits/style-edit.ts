import type {
  FlatDocument,
  StyleBlock,
  StyleChild,
  StyleDeclarations,
  StyleLayer,
} from '@facadeur/core';

export const styleStateNames = ['hover', 'focus-visible', 'disabled'] as const;
export type StyleStateName = (typeof styleStateNames)[number];

/** A declarations map inside the style block. The root node is the block itself. */
export interface StyleEditTarget {
  nodeId: string;
  axis?: string;
  value?: string;
  /** A named component preset whose sparse style override is being edited. */
  variantName?: string;
  state?: StyleStateName;
  /**
   * Non-base breakpoint. Writes `breakpoints[id]` on the style owner.
   * Ignored when `axis` is set: variants are not nested under breakpoints.
   */
  breakpointId?: string;
}

/**
 * Return the sparse style block for a named preset. Older documents stored the
 * same data under `styles.variants.variant.<name>`; read that layer as a
 * compatibility fallback so the first edit can migrate it to overrides.styles.
 */
export function variantStyleBlock(
  document: Pick<FlatDocument, 'styles' | 'variantPresets'>,
  name: string,
): StyleBlock | undefined {
  const preset = document.variantPresets?.find((candidate) => candidate.name === name);
  if (preset?.overrides?.styles) return structuredClone(preset.overrides.styles);

  const rootLayer = document.styles?.variants?.variant?.[name];
  const childLayers = Object.entries(document.styles?.children ?? {})
    .map(([id, child]) => [id, child.variants?.variant?.[name]] as const)
    .filter((entry): entry is readonly [string, StyleLayer] => Boolean(entry[1]));
  if (!rootLayer && !childLayers.length) return undefined;

  const next: StyleBlock = {};
  if (rootLayer) copyLayer(next, rootLayer);
  if (childLayers.length) {
    next.children = {};
    for (const [id, layer] of childLayers) {
      const child: StyleChild = {};
      copyLayer(child, layer);
      next.children[id] = child;
    }
  }
  return next;
}

function copyLayer(target: StyleBlock | StyleChild, source: StyleLayer): void {
  if (source.declarations) target.declarations = structuredClone(source.declarations);
  if (source.states) target.states = structuredClone(source.states);
}

export interface ShownDeclaration {
  property: string;
  /** Value in the field. Viewport mode prefers the override, then the base. */
  value: string;
  /** True when the active viewport stores its own value for this property. */
  overridden: boolean;
}

export interface StyleBreakpointRef {
  uuid: string;
  minWidth: number;
}

/**
 * Base keys first, then properties that exist only on the viewport override,
 * so a breakpoint-only value stays visible and resettable from Base.
 */
export function shownDeclarations(
  base: StyleDeclarations,
  override: StyleDeclarations,
  writingViewport: boolean,
  preferOverrideValues = true,
): ShownDeclaration[] {
  const baseIndex = declarationIndex(base);
  const overrideIndex = declarationIndex(override);
  const keys: string[] = [];
  for (const key of Object.keys(base)) {
    if (keys.some((item) => canonicalStyleProperty(item) === canonicalStyleProperty(key))) continue;
    keys.push(key);
  }
  for (const key of Object.keys(override)) {
    if (keys.some((item) => canonicalStyleProperty(item) === canonicalStyleProperty(key))) continue;
    keys.push(key);
  }
  return keys.map((property) => {
    const canonical = canonicalStyleProperty(property);
    const overrideValue = overrideIndex.get(canonical);
    const baseValue = baseIndex.get(canonical);
    const overridden = overrideValue !== undefined;
    const value =
      writingViewport && preferOverrideValues
        ? (overrideValue ?? baseValue ?? '')
        : (baseValue ?? '');
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
  return declarationsForLayer(layer, target.state);
}

export function canonicalStyleProperty(property: string): string {
  return property.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function declarationIndex(declarations: StyleDeclarations): Map<string, string> {
  const index = new Map<string, string>();
  for (const [property, value] of Object.entries(declarations)) {
    index.set(canonicalStyleProperty(property), value);
  }
  return index;
}

function declarationsForLayer(
  layer: StyleLayer,
  state: StyleEditTarget['state'] | undefined,
): StyleDeclarations {
  const declarations: StyleDeclarations = {};
  mergeDeclarations(declarations, layer.declarations);
  if (state) mergeDeclarations(declarations, layer.states?.[state]);
  return declarations;
}

function mergeDeclarations(target: StyleDeclarations, source: StyleDeclarations | undefined): void {
  for (const [property, value] of Object.entries(source ?? {})) {
    const canonical = canonicalStyleProperty(property);
    for (const existing of Object.keys(target)) {
      if (canonicalStyleProperty(existing) === canonical) delete target[existing];
    }
    target[property] = value;
  }
}

/**
 * Read the value a declaration has at a viewport. CSS media rules cascade, so
 * every preceding breakpoint contributes before the focused layer. State
 * values are applied after normal declarations and therefore inherit normal
 * values when a state only overrides a subset of properties.
 */
export function effectiveStyleDeclarations(
  block: StyleBlock | undefined,
  rootId: string,
  target: StyleEditTarget,
  breakpoints: readonly StyleBreakpointRef[] = [],
): StyleDeclarations {
  if (!block) return {};
  const owner = ownerOf(block, rootId, target.nodeId, false);
  if (!owner) return {};
  if (target.axis && target.value !== undefined) {
    return readStyleDeclarations(block, rootId, target);
  }

  const layers: StyleLayer[] = [owner];
  if (target.breakpointId) {
    const ordered = [...breakpoints].sort((left, right) => left.minWidth - right.minWidth);
    const focused = ordered.find((item) => item.uuid === target.breakpointId);
    const through = focused?.minWidth;
    for (const breakpoint of ordered) {
      if (through !== undefined && breakpoint.minWidth > through) break;
      const layer = owner.breakpoints?.[breakpoint.uuid];
      if (layer) layers.push(layer);
    }
    if (!focused && !ordered.some((item) => item.uuid === target.breakpointId)) {
      const layer = owner.breakpoints?.[target.breakpointId];
      if (layer) layers.push(layer);
    }
  }

  const declarations: StyleDeclarations = {};
  for (const layer of layers) mergeDeclarations(declarations, layer.declarations);
  if (target.state) {
    for (const layer of layers) mergeDeclarations(declarations, layer.states?.[target.state]);
  }
  return declarations;
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
  writeLayerDeclaration(layer, target.state, property, value);
  compactBlock(next);
  return hasContent(next) ? next : null;
}

/**
 * Apply a compound declaration edit to one sparse layer and return one block
 * for one undoable command. Null values remove only the named layer's keys.
 */
export function writeStyleDeclarations(
  block: StyleBlock | undefined,
  rootId: string,
  target: StyleEditTarget,
  patch: Record<string, string | null>,
): StyleBlock | null {
  if (!Object.keys(patch).length) return block ? structuredClone(block) : null;
  const next: StyleBlock = block ? structuredClone(block) : {};
  const layer = ensureLayer(next, rootId, target);
  for (const [property, value] of Object.entries(patch)) {
    writeLayerDeclaration(layer, target.state, property, value);
  }
  compactBlock(next);
  return hasContent(next) ? next : null;
}

/**
 * Edit one property without migrating the rest of the declaration map.
 * Existing camel/kebab storage wins; a newly-created key uses CSS kebab case.
 */
function writeLayerDeclaration(
  layer: StyleLayer,
  state: StyleEditTarget['state'] | undefined,
  property: string,
  value: string | null,
): void {
  const declarations = state ? ((layer.states ??= {})[state] ??= {}) : (layer.declarations ??= {});
  const canonical = canonicalStyleProperty(property);
  const aliases = Object.keys(declarations).filter(
    (candidate) => canonicalStyleProperty(candidate) === canonical,
  );
  const existing = aliases[0];
  for (const alias of aliases) delete declarations[alias];
  if (value !== null) declarations[existing ?? canonical] = value;
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
