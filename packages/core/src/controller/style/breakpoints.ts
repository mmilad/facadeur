import { DocumentError } from '../../document/errors.js';
import type { Breakpoint } from '../../document/schema.js';

const BREAKPOINT_ID = /^[a-z][a-z0-9]*$/;

export function cloneBreakpoints(breakpoints: readonly Breakpoint[]): Breakpoint[] {
  return breakpoints.map((breakpoint) => ({
    id: breakpoint.id,
    minWidth: breakpoint.minWidth,
    ...(breakpoint.label ? { label: breakpoint.label } : {}),
    ...(breakpoint.enabled === false ? { enabled: false } : {}),
  }));
}

export function assertBreakpoints(breakpoints: readonly Breakpoint[] | undefined): void {
  if (!breakpoints) return;
  if (!breakpoints.length) {
    throw new DocumentError('schema', 'Breakpoints must not be empty');
  }
  const ids = new Set<string>();
  const widths = new Map<number, string>();
  const labels = new Map<string, string>();
  for (const breakpoint of breakpoints) {
    if (!BREAKPOINT_ID.test(breakpoint.id)) {
      throw new DocumentError('schema', `Invalid breakpoint id "${breakpoint.id}"`);
    }
    if (ids.has(breakpoint.id)) {
      throw new DocumentError('schema', `Duplicate breakpoint "${breakpoint.id}"`);
    }
    ids.add(breakpoint.id);
    if (!Number.isInteger(breakpoint.minWidth) || breakpoint.minWidth < 1) {
      throw new DocumentError(
        'schema',
        `Breakpoint "${breakpoint.id}" needs a positive integer min-width`,
      );
    }
    const existing = widths.get(breakpoint.minWidth);
    if (existing) {
      throw new DocumentError(
        'schema',
        `Breakpoints "${existing}" and "${breakpoint.id}" share the min-width ${breakpoint.minWidth}`,
      );
    }
    widths.set(breakpoint.minWidth, breakpoint.id);
    if (breakpoint.label === undefined) continue;
    const label = breakpoint.label.trim();
    if (!label || label.length > 48) {
      throw new DocumentError('schema', `Breakpoint "${breakpoint.id}" needs a short label`);
    }
    const existingLabel = labels.get(label);
    if (existingLabel) {
      throw new DocumentError(
        'schema',
        `Breakpoints "${existingLabel}" and "${breakpoint.id}" share the label "${label}"`,
      );
    }
    labels.set(label, breakpoint.id);
  }
  const active = breakpoints.filter((item) => item.enabled !== false);
  if (!active.length) {
    throw new DocumentError('schema', 'At least one viewport must stay active');
  }
}
