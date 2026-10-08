import { type AxisSize, type Command, type SizeValue } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session';
import { commitStyleFields } from '../style-field';

function sizeValue(value: string | undefined): SizeValue | undefined {
  if (!value) return undefined;
  if (/^\{[^{}]+\}$/.test(value)) return value;
  if (/^\d+(?:\.\d+)?px$/.test(value)) return Number.parseFloat(value);
  if (/^\d+(?:\.\d+)?%$/.test(value)) return { unit: '%', value: Number.parseFloat(value) };
  return undefined;
}

/** CSS is authoritative when present; do not disguise arbitrary expressions as a size mode. */
export function shownAxis(
  axis: 'width' | 'height',
  layout: AxisSize | undefined,
  declarations: Record<string, string>,
) {
  const raw = declarations[axis];
  let value = layout;
  let customValue: string | undefined;
  if (raw !== undefined) {
    const fixed = sizeValue(raw);
    if (raw === 'auto') value = { mode: 'auto' };
    else if (raw === 'fit-content' || raw === 'max-content') value = { mode: 'hug' };
    else if (raw === '100%') value = { mode: 'fill' };
    else if (fixed !== undefined) value = { mode: 'fixed', size: fixed };
    else {
      value = undefined;
      customValue = raw;
    }
  }
  if (value) {
    value = { ...value };
    if (layout?.min !== undefined && value.min === undefined) value.min = layout.min;
    if (layout?.max !== undefined && value.max === undefined) value.max = layout.max;
    for (const bound of ['min', 'max'] as const) {
      const rawBound = declarations[`${bound}-${axis}`];
      if (rawBound !== undefined) {
        const parsed = sizeValue(rawBound);
        if (parsed === undefined) delete value[bound];
        else value[bound] = parsed;
      }
    }
  }
  return { value, customValue };
}

function cssSize(value: SizeValue | undefined): string | null {
  if (value === undefined) return null;
  return typeof value === 'number'
    ? `${value}px`
    : typeof value === 'string'
      ? value
      : `${value.value}%`;
}

/** Publish legacy layout cleanup and authoritative size CSS in one Undo transaction. */
export function commitAxisCss(
  session: EditorSession,
  snap: EditorSnapshot,
  nodeId: string,
  breakpointId: string | null,
  axis: 'width' | 'height',
  value: AxisSize | null,
  layoutCleanup?: Command,
) {
  const patch: Record<string, string | null> = {
    [axis]:
      value === null
        ? null
        : value.mode === 'auto'
          ? 'auto'
          : value.mode === 'hug'
            ? 'fit-content'
            : value.mode === 'fill'
              ? '100%'
              : cssSize(value.size),
    [`min-${axis}`]: cssSize(value?.min),
    [`max-${axis}`]: cssSize(value?.max),
  };
  commitStyleFields(session, snap, nodeId, breakpointId, patch, layoutCleanup);
}
