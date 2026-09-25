export type DesignDomain = 'colors' | 'fonts' | 'spacing' | 'radius' | 'shadow' | 'typography';

export type EditorSurface = 'properties' | DesignDomain;

export const DESIGN_DOMAIN_ITEMS: {
  id: DesignDomain;
  label: string;
  keys: string[];
}[] = [
  { id: 'colors', label: 'Colors', keys: ['colors', 'color'] },
  { id: 'fonts', label: 'Fonts', keys: ['fonts', 'font', 'schriften', 'schrift'] },
  { id: 'spacing', label: 'Spacing', keys: ['spacing', 'space'] },
  { id: 'radius', label: 'Radius', keys: ['radius', 'corner', 'rounded'] },
  { id: 'shadow', label: 'Shadow', keys: ['shadow', 'elevation'] },
  { id: 'typography', label: 'Typography', keys: ['typography', 'type'] },
];

export function isDesignDomain(surface: EditorSurface): surface is DesignDomain {
  return surface !== 'properties';
}

export function designDomainLabel(domain: DesignDomain): string {
  return DESIGN_DOMAIN_ITEMS.find((item) => item.id === domain)?.label ?? domain;
}

export function tokenMatchesDomain(
  path: string,
  type: string,
  domain: Exclude<DesignDomain, 'fonts'>,
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
      return type === 'typography' || path.startsWith('type.');
    default:
      return false;
  }
}
