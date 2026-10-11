import type { Breakpoint } from '@facadeur/core';
import { activeBreakpoints } from '@facadeur/core';

/** Base writes the unqueried layer. Viewport writes one min-width override. */
export type StyleEditMode = 'base' | 'viewport';

export interface ViewportRef {
  uuid: string;
  minWidth: number;
  label: string;
}

export interface ViewportEditContext {
  breakpoints: readonly Breakpoint[];
  /** Smallest min-width. Its styles are the base layer and emit no media query. */
  base: ViewportRef | null;
  /** Last clicked frame, when that id is still a breakpoint. */
  focus: ViewportRef | null;
  focusIsBase: boolean;
  editTarget: StyleEditMode;
  /**
   * Breakpoint id to write, or null for the base layer.
   * Viewport mode only writes when the focus is a wider breakpoint.
   */
  writingBreakpointId: string | null;
  /** Focused viewport that can hold a min-width override. Null on the base frame. */
  overrideViewport: ViewportRef | null;
}

export function viewportEditContext(input: {
  breakpoints: readonly Breakpoint[];
  focusId: string | null;
  editTarget: StyleEditMode;
}): ViewportEditContext {
  const breakpoints = activeBreakpoints(input.breakpoints);
  const first = breakpoints[0];
  const base = first ? viewportRef(first) : null;
  const match = input.focusId ? breakpoints.find((item) => item.uuid === input.focusId) : undefined;
  const focus = match ? viewportRef(match) : null;
  const focusIsBase = Boolean(focus && base && focus.uuid === base.uuid);
  const overrideViewport = focus && !focusIsBase ? focus : null;
  const writingBreakpointId =
    input.editTarget === 'viewport' && overrideViewport ? overrideViewport.uuid : null;
  return {
    breakpoints,
    base,
    focus,
    focusIsBase,
    editTarget: input.editTarget,
    writingBreakpointId,
    overrideViewport,
  };
}

function viewportRef(breakpoint: Breakpoint): ViewportRef {
  return {
    uuid: breakpoint.uuid,
    minWidth: breakpoint.minWidth,
    label: breakpoint.label,
  };
}

/** Cue copy for a property that has a min-width override at the focused viewport. */
export function overrideLabel(minWidth: number): string {
  return `Override at ${minWidth}`;
}
