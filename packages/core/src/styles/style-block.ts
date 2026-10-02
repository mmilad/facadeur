import {
  assertComponentTokenDefault,
  assertComponentTokenKind,
  isLocalComponentTokenPath,
} from '../component-tokens.js';
import { defaultBreakpoints, isVariantAxis, type Breakpoint } from '../document/schema.js';
import { DocumentError } from '../document/errors.js';
import { layoutTokenRefs } from './layout.js';
import type { FlatDocument } from '../document/flat.js';
import type { ValidateOptions } from '../validation/tree.js';
import type {
  StyleBlock,
  StyleChild,
  StyleDeclarations,
  StyleLayer,
  TokenInterface,
} from '../document/schema.js';
import {
  assertSpacingValue,
  BREAKPOINT_ID,
  CSS_PROPERTY,
  parseStyleBlock,
  parseTokenInterface,
} from './style-block-parse.js';

const TOKEN_REF = /\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}/g;
const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;

export { parseStyleBlock, parseTokenInterface } from './style-block-parse.js';

export function canonicalizeStyleBlock(style: StyleBlock | undefined): StyleBlock | undefined {
  if (!style) return undefined;
  return parseStyleBlock(style);
}

/** Drop style rules keyed by removed node ids. */
export function pruneStyleBlockNodes(
  style: StyleBlock | undefined,
  removedIds: ReadonlySet<string>,
): StyleBlock | undefined {
  if (!style?.children) return style;
  let changed = false;
  const children = { ...style.children };
  for (const id of removedIds) {
    if (id in children) {
      delete children[id];
      changed = true;
    }
  }
  if (!changed) return style;
  if (!Object.keys(children).length) {
    const { children: _children, ...rest } = style;
    return Object.keys(rest).length ? (rest as StyleBlock) : undefined;
  }
  return { ...style, children };
}

/**
 * Drop one variant axis from the style block, including child rules.
 * Returns undefined when nothing paintable remains.
 */
export function omitVariantAxis(style: StyleBlock, axis: string): StyleBlock | undefined {
  return finishPrune(pruneStyle(style, axis, null));
}

/** Drop variant values that are no longer on the axis. `keep` is the values that remain. */
export function omitVariantValues(
  style: StyleBlock,
  axis: string,
  keep: ReadonlySet<string>,
): StyleBlock | undefined {
  return finishPrune(pruneStyle(style, axis, keep));
}

export function canonicalizeTokenInterface(
  value: TokenInterface | undefined,
): TokenInterface | undefined {
  if (!value) return undefined;
  return parseTokenInterface(value);
}

/** Every DTCG path referenced by the style block and layout. Font-family refs are omitted. */
export function collectTokenRefs(
  doc: Pick<FlatDocument, 'styles' | 'nodes' | 'variantPresets'>,
): string[] {
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

export function assertStyleContract(doc: FlatDocument, options: ValidateOptions = {}): void {
  const breakpoints = doc.settings.breakpoints?.length
    ? doc.settings.breakpoints
    : defaultBreakpoints;
  if (doc.componentTokens) {
    assertComponentTokenKind(doc.kind);
    if (options.globalTokenPaths?.size) {
      for (const token of Object.values(doc.componentTokens)) {
        assertComponentTokenDefault(token.value, options.globalTokenPaths);
      }
    }
  }
  if (doc.styles) assertStyleBlock(doc, doc.styles, breakpoints);
  for (const node of Object.values(doc.nodes)) {
    for (const id of Object.keys(node.layout?.breakpoints ?? {})) {
      assertBreakpoint(id, breakpoints, `Node "${node.id}" layout`);
    }
  }
  const used = collectTokenRefs(doc);
  const reads = doc.tokenInterface?.reads ?? [];
  if (doc.tokenInterface) assertTokenInterfacePaths(doc.tokenInterface, options);
  for (const ref of used) {
    if (isLocalComponentTokenPath(doc, ref)) continue;
    if (!reads.includes(ref)) {
      throw new DocumentError(
        'schema',
        `Token {${ref}} is used but not listed in tokenInterface.reads`,
      );
    }
  }
  for (const ref of refsInText(Object.values(doc.tokenInterface?.sets ?? {}).join(' '))) {
    if (!reads.includes(ref)) {
      throw new DocumentError(
        'schema',
        `Token {${ref}} is set but not listed in tokenInterface.reads`,
      );
    }
  }
  for (const id of Object.keys(doc.styles?.breakpoints ?? {})) {
    assertBreakpoint(id, breakpoints, 'Style');
  }
}

export function assertStyleMap(style: Record<string, string>): void {
  for (const [key, value] of Object.entries(style)) {
    if (!CSS_PROPERTY.test(key)) {
      throw new DocumentError('schema', `Invalid style property "${key}"`);
    }
    if (typeof value !== 'string') {
      throw new DocumentError('schema', `Style "${key}" must be a string`);
    }
    assertSpacingValue(key, value);
  }
}

function assertStyleBlock(
  doc: FlatDocument,
  block: StyleBlock,
  breakpoints: readonly Breakpoint[],
): void {
  const axes = new Map(
    doc.variants
      .filter(isVariantAxis)
      .map((axis) => [axis.name, new Set<string>(axis.values)] as const),
  );
  const namedVariants = (doc.variantPresets ?? [])
    .filter((variant) => variant.name !== 'default')
    .map((variant) => variant.name);
  if (namedVariants.length) axes.set('variant', new Set(['default', ...namedVariants]));
  const nodeIds = new Set(Object.keys(doc.nodes));
  assertLayerVariants(block, axes, 'Style block');
  for (const id of Object.keys(block.breakpoints ?? {})) assertBreakpoint(id, breakpoints, 'Style');
  for (const [id, child] of Object.entries(block.children ?? {})) {
    if (!nodeIds.has(id)) {
      throw new DocumentError('schema', `Style child "${id}" is not a node`);
    }
    assertLayerVariants(child, axes, `Style child "${id}"`);
    for (const breakpointId of Object.keys(child.breakpoints ?? {})) {
      assertBreakpoint(breakpointId, breakpoints, `Style child "${id}"`);
    }
  }
  assertLayerSpacing(block);
  for (const layer of Object.values(block.breakpoints ?? {})) assertLayerSpacing(layer);
  for (const child of Object.values(block.children ?? {})) {
    assertLayerSpacing(child);
    for (const layer of Object.values(child.breakpoints ?? {})) assertLayerSpacing(layer);
  }
}

function assertLayerSpacing(layer: StyleLayer): void {
  assertDeclarationsSpacing(layer.declarations);
  for (const state of Object.values(layer.states ?? {})) assertDeclarationsSpacing(state);
}

function assertLayerVariants(
  layer: { variants?: StyleChild['variants'] },
  axes: Map<string, Set<string>>,
  label: string,
): void {
  for (const [axis, values] of Object.entries(layer.variants ?? {})) {
    const allowed = axes.get(axis);
    if (!allowed) throw new DocumentError('schema', `${label} uses unknown variant "${axis}"`);
    for (const value of Object.keys(values)) {
      if (!allowed.has(value)) {
        throw new DocumentError('schema', `${label} uses unknown ${axis} value "${value}"`);
      }
      const variant = values[value];
      assertDeclarationsSpacing(variant?.declarations);
      for (const state of Object.values(variant?.states ?? {})) assertDeclarationsSpacing(state);
    }
  }
}

function assertDeclarationsSpacing(declarations: StyleDeclarations | undefined): void {
  for (const [property, value] of Object.entries(declarations ?? {})) {
    assertSpacingValue(property, value);
  }
}

function assertBreakpoint(id: string, breakpoints: readonly Breakpoint[], label: string): void {
  if (!BREAKPOINT_ID.test(id)) throw new DocumentError('schema', `Invalid breakpoint "${id}"`);
  const known = breakpoints.some((breakpoint) => breakpoint.id === id);
  if (!known) throw new DocumentError('schema', `${label} uses unknown breakpoint "${id}"`);
  const base = [...breakpoints].sort((left, right) => left.minWidth - right.minWidth)[0];
  if (base && id === base.id) {
    throw new DocumentError(
      'schema',
      `${label} breakpoint "${id}" is the base layer and cannot be overridden`,
    );
  }
}

function assertTokenInterfacePaths(value: TokenInterface, options: ValidateOptions = {}): void {
  for (const path of value.reads ?? []) {
    if (!TOKEN_PATH.test(path)) throw new DocumentError('schema', `Invalid token path "${path}"`);
  }
  for (const path of Object.keys(value.sets ?? {})) {
    if (!TOKEN_PATH.test(path)) throw new DocumentError('schema', `Invalid token path "${path}"`);
    const dot = path.indexOf('.');
    if (dot === -1) continue;
    const documentId = path.slice(0, dot);
    const localPath = path.slice(dot + 1);
    const componentPaths = options.resolveComponentTokenPaths?.(documentId);
    if (componentPaths === undefined) continue;
    if (!componentPaths.has(localPath)) {
      throw new DocumentError(
        'schema',
        `Set path "${path}" is not a component token on "${documentId}"`,
      );
    }
  }
}

function finishPrune(style: StyleBlock): StyleBlock | undefined {
  if (!styleHasContent(style)) return undefined;
  return parseStyleBlock(style);
}

function pruneStyle(
  style: StyleBlock,
  axis: string,
  keepValues: ReadonlySet<string> | null,
): StyleBlock {
  const next = structuredClone(style);
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
): StyleChild['variants'] | undefined {
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

function styleHasContent(style: StyleBlock | StyleChild): boolean {
  const children = 'children' in style ? style.children : undefined;
  return Boolean(
    style.declarations || style.states || style.variants || style.breakpoints || children,
  );
}

function collectBlockRefs(block: StyleBlock, refs: Set<string>): void {
  collectLayerRefs(block, refs);
  for (const layer of Object.values(block.variants ?? {})) {
    for (const variant of Object.values(layer)) collectLayerRefs(variant, refs);
  }
  for (const layer of Object.values(block.breakpoints ?? {})) collectLayerRefs(layer, refs);
  for (const child of Object.values(block.children ?? {})) {
    collectLayerRefs(child, refs);
    for (const layer of Object.values(child.variants ?? {})) {
      for (const variant of Object.values(layer)) collectLayerRefs(variant, refs);
    }
    for (const layer of Object.values(child.breakpoints ?? {})) collectLayerRefs(layer, refs);
  }
}

function collectLayerRefs(layer: StyleLayer, refs: Set<string>): void {
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
