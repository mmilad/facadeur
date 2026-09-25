import type { Breakpoint } from '@facadeur/core';

/** Editor-only stage chrome. Never written to the document DSL. */
export interface ViewportChromeSettings {
  /** Title shown in the viewport chrome bar. Empty uses the default label. */
  title: string;
  /** Space between viewport columns and the chrome card (px). */
  outerPaddingPx: number;
  /** Inset around iframe content inside the device frame (px). Preview only. */
  innerPaddingPx: number;
  /** Preview-only content alignment inside the iframe shell. */
  contentAlign: 'start' | 'center';
}

export const defaultViewportChrome = (): ViewportChromeSettings => ({
  title: '',
  outerPaddingPx: 12,
  innerPaddingPx: 0,
  contentAlign: 'start',
});

export function defaultViewportTitle(breakpoint: Breakpoint): string {
  return `${breakpoint.id} · ${breakpoint.minWidth}`;
}

export function resolvedViewportChrome(
  breakpoint: Breakpoint,
  stored: Partial<ViewportChromeSettings> | undefined,
): ViewportChromeSettings {
  const base = defaultViewportChrome();
  const merged = { ...base, ...stored };
  return {
    title: merged.title.trim() || defaultViewportTitle(breakpoint),
    outerPaddingPx: clampPx(merged.outerPaddingPx, 0, 120),
    innerPaddingPx: clampPx(merged.innerPaddingPx, 0, 160),
    contentAlign: merged.contentAlign === 'center' ? 'center' : 'start',
  };
}

function clampPx(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function chromeStorageKey(documentId: string, breakpointId: string): string {
  return `${documentId}:${breakpointId}`;
}
