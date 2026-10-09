import {
  assertComponentTokenDefault,
  assertComponentTokenKind,
  isLocalComponentTokenPath,
} from '../tokens/component/contract';
import {
  defaultBreakpoints,
  isVariantAxis,
  type Breakpoint,
  type NestedNode,
  type StyleBlock,
  type StyleChild,
  type StyleDeclarations,
  type StyleLayer,
  type TokenInterface,
} from '../../../schema/document';
import { DocumentError } from '../../../document/errors';
import type { FlatDocument } from '../../../document/flat';
import type { ValidateOptions } from '../../validation/types';
import {
  assertSpacingValue,
  BREAKPOINT_ID,
  CSS_PROPERTY,
  parseStyleBlock,
  parseTokenInterface,
} from './parse';
import { assertStyleSelector, selectorClassNames } from '../selectors';
import { flatDocumentClassNames } from '../class-names';
import { collectTokenRefs, refsInText } from '../references/collect';

const TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;

export function canonicalizeStyleBlock(style: StyleBlock | undefined): StyleBlock | undefined {
  if (!style) return undefined;
  return parseStyleBlock(style);
}

export function canonicalizeTokenInterface(
  value: TokenInterface | undefined,
): TokenInterface | undefined {
  if (!value) return undefined;
  return parseTokenInterface(value);
}

export function assertStyleContract(doc: FlatDocument, options: ValidateOptions = {}): void {
  const breakpoints = doc.settings.breakpoints?.length
    ? doc.settings.breakpoints
    : defaultBreakpoints;
  if (doc.componentTokens) {
    assertComponentTokenKind(doc.kind);
    if (options.globalTokenUuids?.size) {
      for (const token of Object.values(doc.componentTokens)) {
        assertComponentTokenDefault(token.value, options.globalTokenUuids);
      }
    }
  }
  flatDocumentClassNames(doc);
  if (doc.styles) assertStyleBlock(doc, doc.styles, breakpoints, options);
  for (const preset of doc.variantPresets ?? []) {
    if (preset.overrides?.styles)
      assertStyleBlock(doc, preset.overrides.styles, breakpoints, options);
  }
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

export function assertStyleNameAvailable(
  doc: Pick<FlatDocument, 'nodes' | 'variantPresets'>,
  styleName: string,
  exceptId?: string,
): void {
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(styleName)) {
    throw new DocumentError('schema', 'CSS class names must start with a letter or underscore');
  }
  const matches = (id: string, candidate: string | undefined) =>
    id !== exceptId && candidate === styleName;
  if (Object.values(doc.nodes).some((node) => matches(node.id, node.styleName))) {
    throw new DocumentError('schema', `CSS class name "${styleName}" is already in use`);
  }
  for (const preset of doc.variantPresets ?? []) {
    for (const insertion of preset.overrides?.insertions ?? []) {
      if (nestedHasStyleName(insertion.node, styleName, exceptId)) {
        throw new DocumentError('schema', `CSS class name "${styleName}" is already in use`);
      }
    }
  }
}

function nestedHasStyleName(node: NestedNode, styleName: string, exceptId?: string): boolean {
  if (node.id !== exceptId && node.styleName === styleName) return true;
  return (
    node.type === 'frame' &&
    (node.children ?? []).some((child) => nestedHasStyleName(child, styleName, exceptId))
  );
}

function assertStyleBlock(
  doc: FlatDocument,
  block: StyleBlock,
  breakpoints: readonly Breakpoint[],
  options: ValidateOptions,
) {
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
  for (const preset of doc.variantPresets ?? []) {
    for (const insertion of preset.overrides?.insertions ?? [])
      collectNestedNodeIds(insertion.node, nodeIds);
  }
  assertLayerVariants(block, axes, 'Style block');
  for (const id of Object.keys(block.breakpoints ?? {})) assertBreakpoint(id, breakpoints, 'Style');
  for (const [target, child] of Object.entries(block.children ?? {})) {
    const path = target.split('/');
    const first = path[0];
    const node = first ? doc.nodes[first] : undefined;
    if (path.length === 1) {
      if (!nodeIds.has(target)) {
        throw new DocumentError('schema', `Style child "${target}" is not a node`);
      }
    } else {
      if (!node) {
        throw new DocumentError(
          'schema',
          `Style child path "${target}" must start at a local node`,
        );
      }
      const valid = options.resolveNestedStyleTarget?.(doc.id, path);
      if (valid === false || (valid === undefined && !hasLocalInstanceBoundary(doc, path))) {
        throw new DocumentError(
          'schema',
          `Style child path "${target}" does not target a local instance root`,
        );
      }
    }
    assertLayerVariants(child, axes, `Style child "${target}"`);
    for (const breakpointId of Object.keys(child.breakpoints ?? {})) {
      assertBreakpoint(breakpointId, breakpoints, `Style child "${target}"`);
    }
  }
  assertLayerSpacing(block);
  for (const layer of Object.values(block.breakpoints ?? {})) assertLayerSpacing(layer);
  for (const child of Object.values(block.children ?? {})) {
    assertLayerSpacing(child);
    for (const layer of Object.values(child.breakpoints ?? {})) assertLayerSpacing(layer);
  }
  for (const rule of block.rules ?? []) {
    assertStyleSelector(rule.selector);
    const classes = selectorClassNames(rule.selector);
    for (const name of classes) {
      const nodeId = Object.hasOwn(rule.bindings, name) ? rule.bindings[name] : undefined;
      if (!nodeId) {
        throw new DocumentError('schema', `Style rule "${rule.id}" does not bind ".${name}"`);
      }
      if (!nodeIds.has(nodeId)) {
        throw new DocumentError(
          'schema',
          `Style rule "${rule.id}" targets missing node "${nodeId}"`,
        );
      }
    }
    for (const name of Object.keys(rule.bindings)) {
      if (!classes.includes(name)) {
        throw new DocumentError(
          'schema',
          `Style rule "${rule.id}" has an unused binding ".${name}"`,
        );
      }
    }
    assertLayerVariants(rule, axes, `Style rule "${rule.id}"`);
    for (const id of Object.keys(rule.breakpoints ?? {})) {
      assertBreakpoint(id, breakpoints, `Style rule "${rule.id}"`);
    }
    assertLayerSpacing(rule);
    for (const layer of Object.values(rule.breakpoints ?? {})) assertLayerSpacing(layer);
  }
}

function collectNestedNodeIds(node: NestedNode, ids: Set<string>): void {
  ids.add(node.id);
  if (node.type === 'frame')
    for (const child of node.children ?? []) collectNestedNodeIds(child, ids);
}

function hasLocalInstanceBoundary(doc: FlatDocument, path: readonly string[]) {
  let current = doc.nodes[path[0] ?? ''];
  if (!current) return false;
  for (const segment of path.slice(1)) {
    if (current.type === 'instance') return true;
    if (current.type !== 'frame') return false;
    const childId: string | undefined = current.children.find(
      (id) => doc.nodes[id]?.id === segment,
    );
    if (!childId) return false;
    current = doc.nodes[childId];
    if (!current) return false;
  }
  return false;
}

function assertLayerSpacing(layer: StyleLayer) {
  assertDeclarationsSpacing(layer.declarations);
  for (const state of Object.values(layer.states ?? {})) assertDeclarationsSpacing(state);
}

function assertLayerVariants(
  layer: { variants?: StyleChild['variants'] },
  axes: Map<string, Set<string>>,
  label: string,
) {
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

function assertDeclarationsSpacing(declarations: StyleDeclarations | undefined) {
  for (const [property, value] of Object.entries(declarations ?? {})) {
    assertSpacingValue(property, value);
  }
}

function assertBreakpoint(id: string, breakpoints: readonly Breakpoint[], label: string) {
  if (!BREAKPOINT_ID.test(id)) throw new DocumentError('schema', `Invalid breakpoint "${id}"`);
  const known = breakpoints.some((breakpoint) => breakpoint.uuid === id);
  if (!known) throw new DocumentError('schema', `${label} uses unknown breakpoint "${id}"`);
  const base = [...breakpoints].sort((left, right) => left.minWidth - right.minWidth)[0];
  if (base && id === base.uuid) {
    throw new DocumentError(
      'schema',
      `${label} breakpoint "${id}" is the base layer and cannot be overridden`,
    );
  }
}

function assertTokenInterfacePaths(value: TokenInterface, options: ValidateOptions = {}) {
  for (const uuid of value.reads ?? []) {
    if (!BREAKPOINT_ID.test(uuid))
      throw new DocumentError('schema', `Invalid token UUID "${uuid}"`);
  }
  for (const target of Object.keys(value.sets ?? {})) {
    if (BREAKPOINT_ID.test(target)) {
      if (options.globalTokenUuids && !options.globalTokenUuids.has(target)) {
        throw new DocumentError('schema', `Set target "${target}" is not a global token UUID`);
      }
      continue;
    }
    if (!TOKEN_PATH.test(target)) {
      throw new DocumentError(
        'schema',
        `Invalid global-token UUID or component-token path "${target}"`,
      );
    }
    const dot = target.indexOf('.');
    const documentId = target.slice(0, dot);
    const localPath = target.slice(dot + 1);
    const componentPaths = options.resolveComponentTokenPaths?.(documentId);
    if (options.resolveComponentTokenPaths && !componentPaths?.has(localPath)) {
      throw new DocumentError(
        'schema',
        `Set path "${target}" is not a component token on "${documentId}"`,
      );
    }
  }
}
