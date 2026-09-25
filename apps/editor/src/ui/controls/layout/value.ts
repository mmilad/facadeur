import type { AxisSize, Layout, LayoutOverride, Spacing } from '@facadeur/core';
import { layoutLayer } from '../../../domain/editing.js';
import type { LayoutPatch } from '../../../domain/editing.js';

export type LayoutControlValue = {
  isFrame: boolean;
  direction?: 'row' | 'column';
  gap?: string;
  padding?: Spacing;
  margin?: Spacing;
  justify?: LayoutOverride['justify'];
  align?: LayoutOverride['align'];
  wrap?: boolean;
  position: 'auto' | 'absolute';
  x?: number;
  y?: number;
  width?: AxisSize;
  height?: AxisSize;
};

export function shownLayoutField<Key extends keyof LayoutOverride>(
  layout: Layout | undefined,
  breakpointId: string | null,
  key: Key,
): LayoutOverride[Key] | undefined {
  const layer = layoutLayer(layout, breakpointId);
  if (layer[key] !== undefined) return layer[key];
  if (breakpointId === null) return undefined;
  return layout?.[key];
}

export function layoutControlValue(input: {
  nodeType: string;
  layout: Layout | undefined;
  writingBreakpointId: string | null;
}): LayoutControlValue {
  const { layout, writingBreakpointId, nodeType } = input;
  const position = shownLayoutField(layout, writingBreakpointId, 'position') ?? 'auto';
  const gapField = shownLayoutField(layout, writingBreakpointId, 'gap');
  return {
    isFrame: nodeType === 'frame',
    direction: shownLayoutField(layout, writingBreakpointId, 'direction'),
    gap: typeof gapField === 'string' ? gapField : undefined,
    padding: shownLayoutField(layout, writingBreakpointId, 'padding'),
    margin: shownLayoutField(layout, writingBreakpointId, 'margin'),
    justify: shownLayoutField(layout, writingBreakpointId, 'justify'),
    align: shownLayoutField(layout, writingBreakpointId, 'align'),
    wrap: shownLayoutField(layout, writingBreakpointId, 'wrap'),
    position: position === 'absolute' ? 'absolute' : 'auto',
    x: shownLayoutField(layout, writingBreakpointId, 'x'),
    y: shownLayoutField(layout, writingBreakpointId, 'y'),
    width: shownLayoutField(layout, writingBreakpointId, 'width'),
    height: shownLayoutField(layout, writingBreakpointId, 'height'),
  };
}

export function directionPatch(value: string): LayoutPatch {
  return {
    direction: value === 'row' || value === 'column' ? value : null,
  };
}

export function justifyLayoutPatch(value: string): LayoutPatch {
  const justify = (['start', 'center', 'end', 'space-between'] as const).find(
    (item) => item === value,
  );
  return { justify: justify ?? null };
}

export function alignLayoutPatch(value: string): LayoutPatch {
  const align = (['start', 'center', 'end', 'stretch'] as const).find((item) => item === value);
  return { align: align ?? null };
}

export function wrapLayoutPatch(checked: boolean, writingBreakpointId: string | null): LayoutPatch {
  if (checked) return { wrap: true };
  if (writingBreakpointId === null) return { wrap: null };
  return { wrap: false };
}

export function freePositionPatch(
  checked: boolean,
  writingBreakpointId: string | null,
): LayoutPatch {
  if (checked) return { position: 'absolute' };
  if (writingBreakpointId === null) return { position: null, x: null, y: null };
  return { position: 'auto', x: null, y: null };
}
