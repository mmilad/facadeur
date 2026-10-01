export const EDITOR_NAVIGATION_PARAMS = {
  document: 'document',
  variant: 'variant',
  layer: 'layer',
  viewport: 'viewport',
  surface: 'surface',
} as const;

export interface EditorNavigationState {
  documentId?: string;
  variantName?: string;
  layerId?: string;
  viewportId?: string;
  surface: string;
}

export interface EditorNavigationParseOptions {
  defaultSurface?: string;
  isSurface?: (value: string) => boolean;
}

type SearchParamsLike = Pick<URLSearchParams, 'get'>;

export function parseEditorNavigation(
  input: SearchParamsLike,
  options: EditorNavigationParseOptions = {},
): EditorNavigationState {
  const defaultSurface = options.defaultSurface ?? 'editor';
  const read = (key: string) => {
    const value = input.get(key)?.trim();
    return value || undefined;
  };
  const requestedSurface = read(EDITOR_NAVIGATION_PARAMS.surface);
  const surface =
    requestedSurface &&
    requestedSurface !== 'properties' &&
    (options.isSurface?.(requestedSurface) ?? true)
      ? requestedSurface
      : defaultSurface;
  return {
    documentId: read(EDITOR_NAVIGATION_PARAMS.document),
    variantName:
      read(EDITOR_NAVIGATION_PARAMS.variant) === 'default'
        ? undefined
        : read(EDITOR_NAVIGATION_PARAMS.variant),
    layerId: read(EDITOR_NAVIGATION_PARAMS.layer),
    viewportId: read(EDITOR_NAVIGATION_PARAMS.viewport),
    surface,
  };
}

export function hasEditorNavigationSelection(input: EditorNavigationState): boolean {
  return Boolean(input.documentId || input.variantName || input.layerId || input.viewportId);
}

/**
 * Update only the editor-owned query keys, preserving unrelated application keys.
 * Empty/default values are omitted so the canonical editor URL stays compact.
 */
export function writeEditorNavigation(
  input: URLSearchParams,
  state: EditorNavigationState,
): URLSearchParams {
  const output = new URLSearchParams(input);
  setOrDelete(output, EDITOR_NAVIGATION_PARAMS.document, state.documentId);
  setOrDelete(output, EDITOR_NAVIGATION_PARAMS.variant, state.variantName);
  setOrDelete(output, EDITOR_NAVIGATION_PARAMS.layer, state.layerId);
  setOrDelete(output, EDITOR_NAVIGATION_PARAMS.viewport, state.viewportId);
  if (!state.surface || state.surface === 'editor') {
    output.delete(EDITOR_NAVIGATION_PARAMS.surface);
  } else {
    output.set(EDITOR_NAVIGATION_PARAMS.surface, state.surface);
  }
  return output;
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
  else params.delete(key);
}
