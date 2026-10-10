export type DesignDomain =
  'colors' | 'fonts' | 'icons' | 'spacing' | 'radius' | 'shadow' | 'typography' | 'viewports';

export type EditorView = 'editor' | 'schemas' | 'schema' | 'code' | 'preview';

export type EditorSurface = EditorView | DesignDomain | 'schemas' | 'props';

export const EDITOR_VIEW_ITEMS: { id: EditorView; label: string }[] = [
  { id: 'editor', label: 'Editor' },
  { id: 'schema', label: 'Schema' },
  { id: 'code', label: 'Code' },
  { id: 'preview', label: 'Preview data' },
];

export const DESIGN_DOMAIN_ITEMS: {
  id: DesignDomain;
  label: string;
  keys: string[];
}[] = [
  { id: 'colors', label: 'Colors', keys: ['colors', 'color'] },
  { id: 'fonts', label: 'Fonts', keys: ['fonts', 'font', 'schriften', 'schrift'] },
  { id: 'icons', label: 'Icons', keys: ['icons', 'icon', 'symbol'] },
  { id: 'spacing', label: 'Spacing', keys: ['spacing', 'space'] },
  { id: 'radius', label: 'Radius', keys: ['radius', 'corner', 'rounded'] },
  { id: 'shadow', label: 'Shadow', keys: ['shadow', 'elevation'] },
  { id: 'typography', label: 'Typography', keys: ['typography', 'type'] },
  { id: 'viewports', label: 'Viewports', keys: ['viewports', 'viewport', 'breakpoint', 'media'] },
];

/** Token domains available in Settings, in the order shown in its navigation. */
export const SETTINGS_TOKEN_DOMAIN_ITEMS = (
  ['viewports', 'fonts', 'colors', 'spacing', 'shadow', 'radius'] as const
).flatMap((id) => DESIGN_DOMAIN_ITEMS.filter((item) => item.id === id));

export type SettingsTokenDomain = (typeof SETTINGS_TOKEN_DOMAIN_ITEMS)[number]['id'];

export const SIDEBAR_DESIGN_ITEMS: typeof DESIGN_DOMAIN_ITEMS = [];

export function isDesignDomain(surface: EditorSurface): surface is DesignDomain {
  return DESIGN_DOMAIN_ITEMS.some((item) => item.id === surface);
}

export function isSettingsTokenDomain(surface: EditorSurface): surface is SettingsTokenDomain {
  return SETTINGS_TOKEN_DOMAIN_ITEMS.some((item) => item.id === surface);
}

export function isEditorView(surface: EditorSurface): surface is EditorView {
  return (
    surface === 'schemas' ||
    surface === 'props' ||
    EDITOR_VIEW_ITEMS.some((item) => item.id === surface)
  );
}

export function isCatalogDocumentView(surface: EditorSurface): boolean {
  return surface === 'schema' || surface === 'code' || surface === 'preview';
}

export function designDomainLabel(domain: DesignDomain): string {
  return DESIGN_DOMAIN_ITEMS.find((item) => item.id === domain)?.label ?? domain;
}

export function tokenMatchesDomain(
  path: string,
  type: string,
  domain: Exclude<DesignDomain, 'fonts' | 'icons' | 'viewports'>,
): boolean {
  switch (domain) {
    case 'colors':
      return type === 'color' || path.startsWith('color.');
    case 'spacing':
      return path.startsWith('space.');
    case 'radius':
      return path.startsWith('radius.');
    case 'shadow':
      return type === 'shadow' || path.startsWith('shadow.');
    case 'typography':
      return type === 'typography' || type === 'fontFamily' || path.startsWith('type.');
    default:
      return false;
  }
}
