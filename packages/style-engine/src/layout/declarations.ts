import type { NestedNode, Layout, LayoutOverride } from '@facadeur/core';
import type { SubstituteContext } from '../css/types';
import { substituteRefs } from '../css/values';
import { mergeDeclarations } from '../css/declarations';
import { spacingDeclarations, axisDeclarations } from './sizing';
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

const NATIVE_CONTROL_TAGS = new Set(['input', 'select', 'textarea']);

export function layoutDeclarations(
  node: NestedNode,
  parentDirection: 'row' | 'column' | undefined,
  context?: SubstituteContext,
): [string, string][] {
  if (node.type === 'frame') {
    // Native controls are leaves even when the document DSL represents them as
    // frames so they can carry layout and bindings. They must not receive the
    // frame's flex-container declarations.
    if (node.tag && NATIVE_CONTROL_TAGS.has(node.tag.toLowerCase())) {
      return placementDeclarations(node.layout, parentDirection, false, context);
    }
    return frameDeclarations(node.layout, parentDirection, context);
  }
  if (!node.layout) return [];
  return placementDeclarations(node.layout, parentDirection, false, context);
}

function frameDeclarations(
  layout: Layout | undefined,
  parentDirection: 'row' | 'column' | undefined,
  context?: SubstituteContext,
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
  if (layout?.gap) decls.push(['gap', substituteRefs(layout.gap, context)]);
  if (layout?.padding) decls.push(...spacingDeclarations('padding', layout.padding, context));
  if (layout?.margin) decls.push(...spacingDeclarations('margin', layout.margin, context));
  decls.push(...placementDeclarations(layout, parentDirection, true, context));
  return decls;
}

function placementDeclarations(
  layout: Layout | LayoutOverride | undefined,
  parentDirection: 'row' | 'column' | undefined,
  isFrame: boolean,
  context?: SubstituteContext,
): [string, string][] {
  if (!layout) return [];
  const decls: [string, string][] = [];
  if (!isFrame && layout.position === 'absolute') decls.push(['position', 'absolute']);
  if (layout.position === 'absolute') {
    if (layout.x !== undefined) decls.push(['left', `${layout.x}px`]);
    if (layout.y !== undefined) decls.push(['top', `${layout.y}px`]);
  }
  if (layout.margin && !isFrame) {
    decls.push(...spacingDeclarations('margin', layout.margin, context));
  }
  decls.push(...axisDeclarations('width', layout.width, parentDirection, context));
  decls.push(...axisDeclarations('height', layout.height, parentDirection, context));
  return decls;
}

export function layoutOverrideDeclarations(
  node: NestedNode,
  override: LayoutOverride,
  parentDirection: 'row' | 'column' | undefined,
  context?: SubstituteContext,
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
    if (override.gap) decls.push(['gap', substituteRefs(override.gap, context)]);
    if (override.padding) decls.push(...spacingDeclarations('padding', override.padding, context));
  }
  if (override.margin) decls.push(...spacingDeclarations('margin', override.margin, context));
  if (override.position === 'absolute') {
    decls.push(['position', 'absolute']);
    if (override.x !== undefined) decls.push(['left', `${override.x}px`]);
    if (override.y !== undefined) decls.push(['top', `${override.y}px`]);
  }
  decls.push(...axisDeclarations('width', override.width, parentDirection, context));
  decls.push(...axisDeclarations('height', override.height, parentDirection, context));
  return mergeDeclarations([decls]);
}
