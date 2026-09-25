import {
  defaultBreakpoints,
  type AxisSize,
  type Breakpoint,
  type DocumentFile,
  type Layout,
  type LayoutOverride,
  type NestedNode,
  type SizeValue,
  type Spacing,
  type StyleBlock,
  type StyleChild,
} from '@facadeur/core';
import { expandDeclarations, mergeDeclarations, substituteRefs } from './values.js';

export interface CompiledRule {
  key: string;
  selector: string;
  declarations: [string, string][];
  /** Set for a breakpoint override. The base layer has no min-width. */
  minWidth?: number;
}

export interface CompileOptions {
  /**
   * `instance` scopes rules with `data-component`, so every instance shares them.
   * `canvas` scopes the open document with `data-id`. Its frame root is the artboard
   * and is not painted, so that root emits no rule — unless `paintRoot` is set.
   */
  address?: 'instance' | 'canvas';
  /**
   * Paint the frame root on the canvas. Pages leave this off. An atom, component,
   * or section root is the component itself, so the open workspace has to show it.
   */
  paintRoot?: boolean;
  /** Used when the document does not list breakpoints. Defaults to mobile, tablet, desktop. */
  breakpoints?: readonly Breakpoint[];
}

const JUSTIFY: Record<NonNullable<Layout['justify']>, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  'space-between': 'space-between',
};

const ALIGN: Record<NonNullable<Layout['align']>, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

/** Turn one document into stylesheet rules. Token refs stay as `var(--…)`. */
export function compileDocument(
  document: DocumentFile,
  options: CompileOptions = {},
): CompiledRule[] {
  const address = options.address ?? 'instance';
  const breakpoints = resolveBreakpoints(document, options.breakpoints);
  const rules: CompiledRule[] = [];
  const rootRendered =
    options.paintRoot === true || !(address === 'canvas' && document.root.type === 'frame');
  walk(document, document.root, {
    address,
    breakpoints,
    parentDirection: undefined,
    path: rootRendered ? document.root.id : null,
    isRoot: true,
    rendered: rootRendered,
    rules,
  });
  return rules.filter((rule) => rule.declarations.length > 0);
}

function resolveBreakpoints(
  document: DocumentFile,
  fallback: readonly Breakpoint[] | undefined,
): Breakpoint[] {
  const list = document.settings?.breakpoints?.length
    ? document.settings.breakpoints
    : fallback?.length
      ? fallback
      : defaultBreakpoints;
  return [...list].sort((left, right) => left.minWidth - right.minWidth);
}

interface WalkState {
  address: 'instance' | 'canvas';
  breakpoints: readonly Breakpoint[];
  parentDirection: 'row' | 'column' | undefined;
  path: string | null;
  isRoot: boolean;
  rendered: boolean;
  rules: CompiledRule[];
}

function walk(document: DocumentFile, node: NestedNode, state: WalkState): void {
  if (state.rendered) emitNode(document, node, state);
  if (node.type !== 'frame') return;
  const direction = node.layout?.direction ?? 'column';
  for (const child of node.children ?? []) {
    const childPath = state.path ? `${state.path}/${child.id}` : child.id;
    walk(document, child, {
      ...state,
      parentDirection: direction,
      path: childPath,
      isRoot: false,
      rendered: true,
    });
  }
}

function emitNode(document: DocumentFile, node: NestedNode, state: WalkState): void {
  const selector = selectorFor(document, node, state);
  const layer = styleLayerFor(document.styles, node, state.isRoot);
  const base = mergeDeclarations([
    layoutDeclarations(node, state.parentDirection),
    state.isRoot ? tokenSetDeclarations(document) : [],
    expandDeclarations(layer?.declarations),
    node.type === 'instance' ? [] : expandDeclarations(node.style),
  ]);
  push(state, `${document.id}:${node.id}:base`, selector, base);

  for (const [name, declarations] of Object.entries(layer?.states ?? {})) {
    if (!declarations) continue;
    push(
      state,
      `${document.id}:${node.id}:state:${name}`,
      `${selector}:${name}`,
      expandDeclarations(declarations),
    );
  }

  for (const [axis, values] of Object.entries(layer?.variants ?? {})) {
    for (const [value, variant] of Object.entries(values)) {
      const variantSelector = withVariant(selector, axis, value);
      push(
        state,
        `${document.id}:${node.id}:variant:${axis}:${value}`,
        variantSelector,
        expandDeclarations(variant.declarations),
      );
      for (const [name, declarations] of Object.entries(variant.states ?? {})) {
        if (!declarations) continue;
        push(
          state,
          `${document.id}:${node.id}:variant:${axis}:${value}:state:${name}`,
          `${variantSelector}:${name}`,
          expandDeclarations(declarations),
        );
      }
    }
  }

  const baseId = state.breakpoints[0]?.id;
  for (const [id, breakpointLayer] of Object.entries(layer?.breakpoints ?? {})) {
    if (id === baseId) continue;
    const minWidth = state.breakpoints.find((breakpoint) => breakpoint.id === id)?.minWidth;
    if (minWidth === undefined) continue;
    push(
      state,
      `${document.id}:${node.id}:style:${id}`,
      selector,
      expandDeclarations(breakpointLayer.declarations),
      minWidth,
    );
    for (const [name, declarations] of Object.entries(breakpointLayer.states ?? {})) {
      if (!declarations) continue;
      push(
        state,
        `${document.id}:${node.id}:style:${id}:state:${name}`,
        `${selector}:${name}`,
        expandDeclarations(declarations),
        minWidth,
      );
    }
  }

  if (node.type === 'instance' || node.layout?.breakpoints) {
    for (const [id, override] of Object.entries(node.layout?.breakpoints ?? {})) {
      if (id === baseId) continue;
      const minWidth = state.breakpoints.find((breakpoint) => breakpoint.id === id)?.minWidth;
      if (minWidth === undefined) continue;
      push(
        state,
        `${document.id}:${node.id}:layout:${id}`,
        selector,
        layoutOverrideDeclarations(node, override, state.parentDirection),
        minWidth,
      );
    }
  }
}

function push(
  state: WalkState,
  key: string,
  selector: string,
  declarations: [string, string][],
  minWidth?: number,
): void {
  if (!declarations.length) return;
  state.rules.push({
    key,
    selector,
    declarations,
    ...(minWidth !== undefined ? { minWidth } : {}),
  });
}

function selectorFor(document: DocumentFile, node: NestedNode, state: WalkState): string {
  if (state.address === 'canvas') return `[data-id="${cssString(state.path ?? node.id)}"]`;
  if (state.isRoot) return `[data-component="${cssString(document.id)}"]`;
  return `[data-component="${cssString(document.id)}"] [data-node="${cssString(node.id)}"]`;
}

function styleLayerFor(
  block: StyleBlock | undefined,
  node: NestedNode,
  isRoot: boolean,
): StyleChild | undefined {
  if (!block) return undefined;
  if (isRoot) return block;
  return block.children?.[node.id];
}

function withVariant(selector: string, axis: string, value: string): string {
  const attribute = `[data-variant-${axis}="${cssString(value)}"]`;
  const space = selector.indexOf(' ');
  if (space === -1) return `${selector}${attribute}`;
  return `${selector.slice(0, space)}${attribute}${selector.slice(space)}`;
}

function tokenSetDeclarations(document: DocumentFile): [string, string][] {
  return Object.entries(document.tokenInterface?.sets ?? {}).map(([path, value]) => [
    customProperty(path),
    substituteRefs(value),
  ]);
}

function customProperty(path: string): string {
  return `--${path.split('.').join('-')}`;
}

function layoutDeclarations(
  node: NestedNode,
  parentDirection: 'row' | 'column' | undefined,
): [string, string][] {
  if (node.type === 'frame') return frameDeclarations(node.layout, parentDirection);
  if (!node.layout) return [];
  return placementDeclarations(node.layout, parentDirection, false);
}

function frameDeclarations(
  layout: Layout | undefined,
  parentDirection: 'row' | 'column' | undefined,
): [string, string][] {
  const direction = layout?.direction ?? 'column';
  const justify = layout?.justify ?? 'start';
  const align = layout?.align ?? 'stretch';
  const decls: [string, string][] = [
    ['display', 'flex'],
    ['flex-direction', direction],
    ['flex-wrap', layout?.wrap ? 'wrap' : 'nowrap'],
    ['box-sizing', 'border-box'],
    ['position', layout?.position === 'absolute' ? 'absolute' : 'relative'],
    ['justify-content', JUSTIFY[justify]],
    ['align-items', ALIGN[align]],
  ];
  if (layout?.gap) decls.push(['gap', substituteRefs(layout.gap)]);
  if (layout?.padding) decls.push(...spacingDeclarations('padding', layout.padding));
  if (layout?.margin) decls.push(...spacingDeclarations('margin', layout.margin));
  decls.push(...placementDeclarations(layout, parentDirection, true).filter(keepPlacement));
  return decls;
}

function keepPlacement([name]: [string, string]): boolean {
  return (
    name === 'left' ||
    name === 'top' ||
    name === 'width' ||
    name === 'height' ||
    name === 'min-width' ||
    name === 'max-width' ||
    name === 'min-height' ||
    name === 'max-height' ||
    name === 'flex' ||
    name === 'align-self'
  );
}

function placementDeclarations(
  layout: Layout | LayoutOverride | undefined,
  parentDirection: 'row' | 'column' | undefined,
  isFrame: boolean,
): [string, string][] {
  if (!layout) return [];
  const decls: [string, string][] = [];
  if (!isFrame && layout.position === 'absolute') decls.push(['position', 'absolute']);
  if (layout.position === 'absolute') {
    if (layout.x !== undefined) decls.push(['left', `${layout.x}px`]);
    if (layout.y !== undefined) decls.push(['top', `${layout.y}px`]);
  }
  if (layout.margin && !isFrame) decls.push(...spacingDeclarations('margin', layout.margin));
  decls.push(...axisDeclarations('width', layout.width, parentDirection));
  decls.push(...axisDeclarations('height', layout.height, parentDirection));
  return decls;
}

function layoutOverrideDeclarations(
  node: NestedNode,
  override: LayoutOverride,
  parentDirection: 'row' | 'column' | undefined,
): [string, string][] {
  const decls: [string, string][] = [];
  if (node.type === 'frame') {
    if (override.direction) decls.push(['flex-direction', override.direction]);
    if (override.wrap !== undefined) decls.push(['flex-wrap', override.wrap ? 'wrap' : 'nowrap']);
    if (override.justify) decls.push(['justify-content', JUSTIFY[override.justify]]);
    if (override.align) decls.push(['align-items', ALIGN[override.align]]);
    if (override.position) {
      decls.push(['position', override.position === 'absolute' ? 'absolute' : 'relative']);
    }
    if (override.gap) decls.push(['gap', substituteRefs(override.gap)]);
    if (override.padding) decls.push(...spacingDeclarations('padding', override.padding));
  }
  if (override.margin) decls.push(...spacingDeclarations('margin', override.margin));
  if (override.position === 'absolute') {
    decls.push(['position', 'absolute']);
    if (override.x !== undefined) decls.push(['left', `${override.x}px`]);
    if (override.y !== undefined) decls.push(['top', `${override.y}px`]);
  }
  decls.push(...axisDeclarations('width', override.width, parentDirection));
  decls.push(...axisDeclarations('height', override.height, parentDirection));
  return mergeDeclarations([decls]);
}

function spacingDeclarations(property: 'padding' | 'margin', value: Spacing): [string, string][] {
  if (typeof value === 'string') return [[property, substituteRefs(value)]];
  return (['top', 'right', 'bottom', 'left'] as const).flatMap((side) => {
    const item = value[side];
    return item ? [[`${property}-${side}`, substituteRefs(item)] as [string, string]] : [];
  });
}

function axisDeclarations(
  axis: 'width' | 'height',
  size: AxisSize | undefined,
  parentDirection: 'row' | 'column' | undefined,
): [string, string][] {
  if (!size) return [];
  const decls: [string, string][] = [];
  const main =
    (parentDirection === 'row' && axis === 'width') ||
    (parentDirection === 'column' && axis === 'height');
  if (size.mode === 'hug') decls.push([axis, 'fit-content']);
  else if (size.mode === 'fill') {
    if (parentDirection && main) {
      decls.push(['flex', '1 1 auto'], [axis === 'width' ? 'min-width' : 'min-height', '0']);
    } else if (parentDirection) {
      decls.push(['align-self', 'stretch'], [axis, 'auto']);
    } else decls.push([axis, '100%']);
  } else if (size.size !== undefined) {
    decls.push([axis, formatSize(size.size)], ['flex', '0 0 auto']);
  }
  if (size.min !== undefined) {
    decls.push([axis === 'width' ? 'min-width' : 'min-height', formatSize(size.min)]);
  }
  if (size.max !== undefined) {
    decls.push([axis === 'width' ? 'max-width' : 'max-height', formatSize(size.max)]);
  }
  return decls;
}

function formatSize(value: SizeValue): string {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return substituteRefs(value);
  return `${value.value}%`;
}

function cssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
