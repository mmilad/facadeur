import type { Breakpoint, FlatDocument } from '@facadeur/core';
import { activeBreakpoints } from '@facadeur/tokens';

/** Base writes the unqueried layer. Viewport writes one min-width override. */
export type StyleEditMode = 'base' | 'viewport';

export interface ViewportRef {
  id: string;
  minWidth: number;
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

/** Same list the stage uses: the open document, else the design, else the defaults. */
export function editorBreakpoints(document: FlatDocument, design: FlatDocument): Breakpoint[] {
  const own = document.settings.breakpoints;
  const listed = own?.length ? own : design.settings.breakpoints;
  return activeBreakpoints(listed);
}

export function viewportEditContext(input: {
  breakpoints: readonly Breakpoint[];
  focusId: string | null;
  editTarget: StyleEditMode;
}): ViewportEditContext {
  const breakpoints = activeBreakpoints(input.breakpoints);
  const first = breakpoints[0];
  const base = first ? { id: first.id, minWidth: first.minWidth } : null;
  const match = input.focusId ? breakpoints.find((item) => item.id === input.focusId) : undefined;
  const focus = match ? { id: match.id, minWidth: match.minWidth } : null;
  const focusIsBase = Boolean(focus && base && focus.id === base.id);
  const overrideViewport = focus && !focusIsBase ? focus : null;
  const writingBreakpointId =
    input.editTarget === 'viewport' && overrideViewport ? overrideViewport.id : null;
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

/** Cue copy for a property that has a min-width override at the focused viewport. */
export function overrideLabel(minWidth: number): string {
  return `Override bei ${minWidth}`;
}
