import { DocumentError } from '../../document/errors';
import { UUID_PATTERN } from '../../document/ids';
import type { Breakpoint } from '../../schema/document';

export function cloneBreakpoints(breakpoints: readonly Breakpoint[]): Breakpoint[] {
  return breakpoints.map((breakpoint) => ({
    uuid: breakpoint.uuid,
    minWidth: breakpoint.minWidth,
    label: breakpoint.label,
    ...(breakpoint.enabled === false ? { enabled: false } : {}),
  }));
}

export function assertBreakpoints(breakpoints: readonly Breakpoint[] | undefined): void {
  if (!breakpoints) return;
  if (!breakpoints.length) {
    throw new DocumentError('schema', 'Breakpoints must not be empty');
  }
  const uuids = new Set<string>();
  const widths = new Map<number, string>();
  const labels = new Map<string, string>();
  for (const breakpoint of breakpoints) {
    if (!UUID_PATTERN.test(breakpoint.uuid)) {
      throw new DocumentError('schema', `Invalid breakpoint UUID "${breakpoint.uuid}"`);
    }
    if (uuids.has(breakpoint.uuid)) {
      throw new DocumentError('schema', `Duplicate breakpoint "${breakpoint.uuid}"`);
    }
    uuids.add(breakpoint.uuid);
    if (!Number.isInteger(breakpoint.minWidth) || breakpoint.minWidth < 1) {
      throw new DocumentError(
        'schema',
        `Breakpoint "${breakpoint.uuid}" needs a positive integer min-width`,
      );
    }
    const existing = widths.get(breakpoint.minWidth);
    if (existing) {
      throw new DocumentError(
        'schema',
        `Breakpoints "${existing}" and "${breakpoint.uuid}" share the min-width ${breakpoint.minWidth}`,
      );
    }
    widths.set(breakpoint.minWidth, breakpoint.uuid);
    const label = breakpoint.label.trim();
    if (!label || label.length > 48) {
      throw new DocumentError('schema', `Breakpoint "${breakpoint.uuid}" needs a short label`);
    }
    const existingLabel = labels.get(label);
    if (existingLabel) {
      throw new DocumentError(
        'schema',
        `Breakpoints "${existingLabel}" and "${breakpoint.uuid}" share the label "${label}"`,
      );
    }
    labels.set(label, breakpoint.uuid);
  }
  const active = breakpoints.filter((item) => item.enabled !== false);
  if (!active.length) {
    throw new DocumentError('schema', 'At least one viewport must stay active');
  }
}
