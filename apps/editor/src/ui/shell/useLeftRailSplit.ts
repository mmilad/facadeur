import { useCallback, useEffect, useState } from 'react';

const RATIO_KEY = 'facadeur.leftRail.projectRatio';
const COLLAPSED_KEY = 'facadeur.leftRail.projectCollapsed';

/** Keep Layers prominent while giving Project enough room for its tree. */
export const LEFT_RAIL_PROJECT_RATIO_DEFAULT = 0.4;
const MIN_RATIO = 0.12;
const MAX_RATIO = 0.72;

export const LEFT_RAIL_PROJECT_COLLAPSED_HEIGHT = 36;
export const LEFT_RAIL_MIN_PROJECT_PX = 72;
export const LEFT_RAIL_MIN_LAYERS_PX = 96;
export const LEFT_RAIL_SPLIT_HANDLE_PX = 6;

/** Convert the split pointer position into the persisted project share. */
export function projectRatioFromPointer(
  clientY: number,
  containerTop: number,
  containerBottom: number,
): number | undefined {
  const available = containerBottom - containerTop - LEFT_RAIL_SPLIT_HANDLE_PX;
  if (available <= 0) return undefined;

  const minimumsFit = available >= LEFT_RAIL_MIN_PROJECT_PX + LEFT_RAIL_MIN_LAYERS_PX;
  const minProject = minimumsFit ? LEFT_RAIL_MIN_PROJECT_PX : available / 2;
  const minLayers = minimumsFit ? LEFT_RAIL_MIN_LAYERS_PX : available / 2;
  const projectPx = containerBottom - clientY;
  const clamped = Math.min(available - minLayers, Math.max(minProject, projectPx));
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, clamped / available));
}

function readStoredRatio(): number {
  if (typeof window === 'undefined') return LEFT_RAIL_PROJECT_RATIO_DEFAULT;
  const raw = window.localStorage.getItem(RATIO_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return LEFT_RAIL_PROJECT_RATIO_DEFAULT;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, parsed));
}

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(COLLAPSED_KEY) === '1';
}

export function useLeftRailSplit() {
  const [projectRatio, setProjectRatio] = useState(LEFT_RAIL_PROJECT_RATIO_DEFAULT);
  const [projectCollapsed, setProjectCollapsed] = useState(false);

  useEffect(() => {
    setProjectRatio(readStoredRatio());
    setProjectCollapsed(readStoredCollapsed());
  }, []);

  const persistRatio = useCallback((next: number) => {
    const clamped = Math.min(MAX_RATIO, Math.max(MIN_RATIO, next));
    setProjectRatio(clamped);
    window.localStorage.setItem(RATIO_KEY, String(clamped));
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setProjectCollapsed(next);
    window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
  }, []);

  const collapseProject = useCallback(() => {
    persistCollapsed(true);
  }, [persistCollapsed]);

  const expandProject = useCallback(() => {
    persistCollapsed(false);
  }, [persistCollapsed]);

  return {
    projectRatio,
    persistRatio,
    projectCollapsed,
    collapseProject,
    expandProject,
    minRatio: MIN_RATIO,
    maxRatio: MAX_RATIO,
  };
}
