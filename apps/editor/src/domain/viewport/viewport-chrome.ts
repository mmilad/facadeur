import { breakpointLabel, type Breakpoint } from '@facadeur/core';

/** Legacy export retained for callers; previews no longer add an inset. */
export const ASSET_PREVIEW_INNER_PADDING_PX = 0;

/** Editor-only stage chrome. Never written to the document DSL. */
export interface ViewportChromeSettings {
  /** Title shown in the viewport chrome bar. Empty uses the default label. */
  title: string;
  /** Legacy metadata accepted for compatibility; rendering always uses zero. */
  outerPaddingPx: number;
  /** Legacy metadata accepted for compatibility; rendering always uses zero. */
  innerPaddingPx: number;
  /** Preview-only content alignment inside the iframe shell. */
  contentAlign: 'start' | 'center';
}

export function usesAssetPreviewInset(kind: string | undefined): boolean {
  return kind === 'atom' || kind === 'component' || kind === 'section';
}

export function defaultViewportChrome(_documentKind?: string): ViewportChromeSettings {
  return {
    title: '',
    outerPaddingPx: 0,
    innerPaddingPx: 0,
    contentAlign: 'start',
  };
}

export function defaultViewportTitle(breakpoint: Breakpoint): string {
  return `${breakpointLabel(breakpoint)} · ${breakpoint.minWidth}`;
}

export function resolvedViewportChrome(
  breakpoint: Breakpoint,
  stored: Partial<ViewportChromeSettings> | undefined,
  documentKind?: string,
): ViewportChromeSettings {
  const base = defaultViewportChrome(documentKind);
  const merged = { ...base, ...stored };
  return {
    title: merged.title.trim() || defaultViewportTitle(breakpoint),
    outerPaddingPx: 0,
    innerPaddingPx: 0,
    contentAlign: merged.contentAlign === 'center' ? 'center' : 'start',
  };
}

export function chromeStorageKey(documentId: string, breakpointId: string): string {
  return `${documentId}:${breakpointId}`;
}
