import type { AxisSize, SizeValue, Spacing } from '@facadeur/core';
import type { SubstituteContext } from '../css/types';
import { substituteRefs } from '../css/values';
export function spacingDeclarations(
  property: 'padding' | 'margin',
  value: Spacing,
  context?: SubstituteContext,
): [string, string][] {
  if (typeof value === 'string') return [[property, substituteRefs(value, context)]];
  return (['top', 'right', 'bottom', 'left'] as const).flatMap((side) => {
    const item = value[side];
    return item ? [[`${property}-${side}`, substituteRefs(item, context)] as [string, string]] : [];
  });
}

export function axisDeclarations(
  axis: 'width' | 'height',
  size: AxisSize | undefined,
  parentDirection: 'row' | 'column' | undefined,
  context?: SubstituteContext,
): [string, string][] {
  if (!size) return [];
  const decls: [string, string][] = [];
  const main =
    (parentDirection === 'row' && axis === 'width') ||
    (parentDirection === 'column' && axis === 'height');
  if (size.mode === 'auto') decls.push([axis, 'auto']);
  else if (size.mode === 'hug') decls.push([axis, 'fit-content']);
  else if (size.mode === 'fill') {
    if (parentDirection && main) {
      decls.push(['flex', '1 1 auto'], [axis === 'width' ? 'min-width' : 'min-height', '0']);
    } else if (parentDirection) {
      decls.push(['align-self', 'stretch'], [axis, 'auto']);
    } else decls.push([axis, '100%']);
  } else if (size.size !== undefined) {
    decls.push([axis, formatSize(size.size, context)], ['flex', '0 0 auto']);
  }
  if (size.min !== undefined) {
    decls.push([axis === 'width' ? 'min-width' : 'min-height', formatSize(size.min, context)]);
  }
  if (size.max !== undefined) {
    decls.push([axis === 'width' ? 'max-width' : 'max-height', formatSize(size.max, context)]);
  }
  return decls;
}

function formatSize(value: SizeValue, context?: SubstituteContext): string {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return substituteRefs(value, context);
  return `${value.value}%`;
}
