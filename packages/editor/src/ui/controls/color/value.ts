const TOKEN_REF = /^\{[a-z0-9.]+\}$/;

export const KNOWN_COLOR_STYLE_PROPERTIES = new Set([
  'color',
  'background',
  'background-color',
  'border-color',
  'outline-color',
  'fill',
  'stroke',
]);

export function isColorTokenRef(value: string): boolean {
  return TOKEN_REF.test(value.trim());
}

export type ColorControlMode = 'token' | 'custom';

export function inferColorMode(value: string): ColorControlMode {
  const trimmed = value.trim();
  if (!trimmed) return 'custom';
  return isColorTokenRef(trimmed) ? 'token' : 'custom';
}

export function isColorStyleProperty(property: string): boolean {
  const name = property.trim().toLowerCase();
  if (!name) return false;
  if (KNOWN_COLOR_STYLE_PROPERTIES.has(name)) return true;
  if (name.endsWith('-color')) return true;
  if (name.includes('color') && (name.startsWith('border') || name.startsWith('outline'))) {
    return true;
  }
  return false;
}

/** Value passed to ColorInput in custom mode (token refs are not valid CSS colors). */
export function customColorDraft(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || isColorTokenRef(trimmed)) return '';
  return trimmed;
}
