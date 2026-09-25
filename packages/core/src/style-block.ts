import { defaultBreakpoints, type Breakpoint } from './schema.js';
import { DocumentError } from './errors.js';
import { layoutTokenRefs } from './layout.js';
import type { FlatDocument } from './flat.js';
import type {
  StyleBlock,
  StyleChild,
  StyleDeclarations,
  StyleLayer,
  StyleStates,
  TokenInterface,
} from './schema.js';

const TOKEN_REF = /\{([a-z][a-z0-9]*(?:\.[a-z0-9]+)*)\}/g;
const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;
const CSS_PROPERTY = /^(--)?[A-Za-z_][\w-]*$/;
const BREAKPOINT_ID = /^[a-z][a-z0-9]*$/;
const STATE_NAMES = ['hover', 'focus-visible', 'disabled'] as const;

/**
 * Gap, padding, and margin accept only a token reference. Longhands included.
 * Checked on the style block and on `node.style`, whatever letter case the key uses.
 */
const SPACING_PROPERTY =
  /^(gap|row-gap|column-gap|padding|margin|padding-(top|right|bottom|left|inline|block)|margin-(top|right|bottom|left|inline|block))$/;

export function canonicalizeStyleBlock(style: StyleBlock | undefined): StyleBlock | undefined {
  if (!style) return undefined;
  return parseStyleBlock(style);
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
export function collectTokenRefs(doc: Pick<FlatDocument, 'styles' | 'nodes'>): string[] {
  const refs = new Set<string>();
  if (doc.styles) collectBlockRefs(doc.styles, refs);
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

export function assertStyleContract(doc: FlatDocument): void {
  const breakpoints = doc.settings.breakpoints?.length
    ? doc.settings.breakpoints
    : defaultBreakpoints;
  if (doc.styles) assertStyleBlock(doc, doc.styles, breakpoints);
  for (const node of Object.values(doc.nodes)) {
    for (const id of Object.keys(node.layout?.breakpoints ?? {})) {
      assertBreakpoint(id, breakpoints, `Node "${node.id}" layout`);
    }
  }
  const used = collectTokenRefs(doc);
  const reads = doc.tokenInterface?.reads ?? [];
  if (doc.tokenInterface) assertTokenInterfacePaths(doc.tokenInterface);
  for (const ref of used) {
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

export function parseStyleBlock(value: unknown): StyleBlock {
  const record = requireRecord(value, 'Style block');
  const block: StyleBlock = parseChild(record, 'Style block');
  if (record.children !== undefined) {
    if (!isRecord(record.children)) {
      throw new DocumentError('schema', 'Style block children must be an object');
    }
    const children: Record<string, StyleChild> = {};
    for (const id of Object.keys(record.children).sort()) {
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)) {
        throw new DocumentError('schema', `Invalid style child id "${id}"`);
      }
      const child = record.children[id];
      if (!isRecord(child)) {
        throw new DocumentError('schema', `Style child "${id}" must be an object`);
      }
      if ('children' in child) {
        throw new DocumentError('schema', `Style child "${id}" cannot contain children`);
      }
      children[id] = parseChild(child, `Style child "${id}"`);
    }
    if (Object.keys(children).length) block.children = children;
  }
  assertKnown(
    record,
    ['declarations', 'states', 'variants', 'breakpoints', 'children'],
    'Style block',
  );
  return block;
}

export function parseTokenInterface(value: unknown): TokenInterface {
  const record = requireRecord(value, 'Token interface');
  const next: TokenInterface = {};
  if (record.reads !== undefined) {
    if (!Array.isArray(record.reads) || record.reads.length === 0) {
      throw new DocumentError('schema', 'tokenInterface.reads must be a non-empty array');
    }
    const reads = record.reads.map((item) => {
      if (typeof item !== 'string' || !TOKEN_PATH.test(item)) {
        throw new DocumentError('schema', `Invalid token path "${String(item)}" in reads`);
      }
      return item;
    });
    if (new Set(reads).size !== reads.length) {
      throw new DocumentError('schema', 'tokenInterface.reads contains a duplicate');
    }
    next.reads = [...reads].sort();
  }
  if (record.sets !== undefined) {
    if (!isRecord(record.sets)) {
      throw new DocumentError('schema', 'tokenInterface.sets must be an object');
    }
    const sets: Record<string, string> = {};
    for (const path of Object.keys(record.sets).sort()) {
      if (!TOKEN_PATH.test(path)) {
        throw new DocumentError('schema', `Invalid token path "${path}" in sets`);
      }
      const item = record.sets[path];
      if (typeof item !== 'string' || item.length === 0) {
        throw new DocumentError('schema', `Token set "${path}" must be a string`);
      }
      sets[path] = item;
    }
    if (!Object.keys(sets).length) {
      throw new DocumentError('schema', 'tokenInterface.sets must not be empty');
    }
    next.sets = sets;
  }
  assertKnown(record, ['reads', 'sets'], 'Token interface');
  if (!next.reads && !next.sets) {
    throw new DocumentError('schema', 'Token interface needs reads or sets');
  }
  return next;
}

function assertStyleBlock(
  doc: FlatDocument,
  block: StyleBlock,
  breakpoints: readonly Breakpoint[],
): void {
  const axes = new Map(doc.variants.map((axis) => [axis.name, new Set(axis.values)]));
  const nodeIds = new Set(Object.keys(doc.nodes));
  assertLayerVariants(block, axes, 'Style block');
  for (const id of Object.keys(block.breakpoints ?? {})) assertBreakpoint(id, breakpoints, 'Style');
  for (const [id, child] of Object.entries(block.children ?? {})) {
    if (!nodeIds.has(id)) {
      throw new DocumentError('schema', `Style child "${id}" is not a node`);
    }
    if (doc.nodes[id]?.type === 'instance') {
      throw new DocumentError(
        'schema',
        `Style child "${id}" is an instance and cannot carry style`,
      );
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

function assertSpacingValue(property: string, value: string): void {
  if (!SPACING_PROPERTY.test(toKebab(property))) return;
  if (!/^\{[a-z][a-z0-9]*(?:\.[a-z0-9]+)+\}$/.test(value)) {
    throw new DocumentError(
      'schema',
      `${property} must be a spacing token reference, not "${value}"`,
    );
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

function assertTokenInterfacePaths(value: TokenInterface): void {
  for (const path of value.reads ?? []) {
    if (!TOKEN_PATH.test(path)) throw new DocumentError('schema', `Invalid token path "${path}"`);
  }
  for (const path of Object.keys(value.sets ?? {})) {
    if (!TOKEN_PATH.test(path)) throw new DocumentError('schema', `Invalid token path "${path}"`);
  }
}

function parseChild(record: Record<string, unknown>, label: string): StyleChild {
  const child: StyleChild = {};
  if (record.declarations !== undefined)
    child.declarations = parseDeclarations(record.declarations, label);
  if (record.states !== undefined) child.states = parseStates(record.states, label);
  if (record.variants !== undefined) child.variants = parseVariants(record.variants, label);
  if (record.breakpoints !== undefined) {
    child.breakpoints = parseBreakpointLayers(record.breakpoints, label);
  }
  return child;
}

function parseDeclarations(value: unknown, label: string): StyleDeclarations {
  if (!isRecord(value))
    throw new DocumentError('schema', `${label} declarations must be an object`);
  const declarations: StyleDeclarations = {};
  for (const key of Object.keys(value).sort()) {
    if (!CSS_PROPERTY.test(key)) {
      throw new DocumentError('schema', `${label} has invalid property "${key}"`);
    }
    const item = value[key];
    if (typeof item !== 'string') {
      throw new DocumentError('schema', `${label} property "${key}" must be a string`);
    }
    assertSpacingValue(key, item);
    declarations[key] = item;
  }
  if (!Object.keys(declarations).length) {
    throw new DocumentError('schema', `${label} declarations must not be empty`);
  }
  return declarations;
}

function parseStates(value: unknown, label: string): StyleStates {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} states must be an object`);
  const states: StyleStates = {};
  for (const name of STATE_NAMES) {
    if (value[name] !== undefined)
      states[name] = parseDeclarations(value[name], `${label} :${name}`);
  }
  assertKnown(value, [...STATE_NAMES], `${label} states`);
  if (!Object.keys(states).length)
    throw new DocumentError('schema', `${label} states must not be empty`);
  return states;
}

function parseVariants(value: unknown, label: string): NonNullable<StyleChild['variants']> {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} variants must be an object`);
  const variants: NonNullable<StyleChild['variants']> = {};
  for (const axis of Object.keys(value).sort()) {
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(axis)) {
      throw new DocumentError('schema', `${label} has invalid variant axis "${axis}"`);
    }
    const values = value[axis];
    if (!isRecord(values)) {
      throw new DocumentError('schema', `${label} variant "${axis}" must be an object`);
    }
    const parsed: Record<string, StyleLayer> = {};
    for (const name of Object.keys(values).sort()) {
      if (!name) throw new DocumentError('schema', `${label} variant "${axis}" has an empty value`);
      const layer = values[name];
      if (!isRecord(layer)) {
        throw new DocumentError('schema', `${label} variant ${axis}=${name} must be an object`);
      }
      if ('variants' in layer || 'breakpoints' in layer || 'children' in layer) {
        throw new DocumentError(
          'schema',
          `${label} variant ${axis}=${name} only supports declarations and states`,
        );
      }
      const next = parseLayer(layer, `${label} variant ${axis}=${name}`);
      parsed[name] = next;
    }
    if (!Object.keys(parsed).length) {
      throw new DocumentError('schema', `${label} variant "${axis}" must not be empty`);
    }
    variants[axis] = parsed;
  }
  if (!Object.keys(variants).length) {
    throw new DocumentError('schema', `${label} variants must not be empty`);
  }
  return variants;
}

function parseBreakpointLayers(
  value: unknown,
  label: string,
): NonNullable<StyleChild['breakpoints']> {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} breakpoints must be an object`);
  const breakpoints: NonNullable<StyleChild['breakpoints']> = {};
  for (const id of Object.keys(value).sort()) {
    if (!BREAKPOINT_ID.test(id)) {
      throw new DocumentError('schema', `${label} has invalid breakpoint "${id}"`);
    }
    const layer = value[id];
    if (!isRecord(layer)) {
      throw new DocumentError('schema', `${label} breakpoint "${id}" must be an object`);
    }
    if ('variants' in layer || 'breakpoints' in layer || 'children' in layer) {
      throw new DocumentError(
        'schema',
        `${label} breakpoint "${id}" only supports declarations and states`,
      );
    }
    breakpoints[id] = parseLayer(layer, `${label} breakpoint "${id}"`);
  }
  if (!Object.keys(breakpoints).length) {
    throw new DocumentError('schema', `${label} breakpoints must not be empty`);
  }
  return breakpoints;
}

function parseLayer(record: Record<string, unknown>, label: string): StyleLayer {
  const layer: StyleLayer = {};
  if (record.declarations !== undefined)
    layer.declarations = parseDeclarations(record.declarations, label);
  if (record.states !== undefined) layer.states = parseStates(record.states, label);
  assertKnown(record, ['declarations', 'states'], label);
  if (!layer.declarations && !layer.states) {
    throw new DocumentError('schema', `${label} must set declarations or states`);
  }
  return layer;
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

/** `{font.sans}` names a family. `{font.weight.regular}` is a token. */
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

function toKebab(property: string): string {
  if (property.startsWith('--')) return property;
  return property.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (letters, offset) => {
    return (offset ? '-' : '') + letters.toLowerCase();
  });
}

function assertKnown(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key))
      throw new DocumentError('schema', `${label} has unknown property "${key}"`);
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new DocumentError('schema', `${label} must be an object`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
