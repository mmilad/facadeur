const TOKEN_REF = /^\{[a-z0-9.]+\}$/;

export const KNOWN_SHADOW_STYLE_PROPERTIES = new Set(['box-shadow', 'text-shadow']);

export function isShadowTokenRef(value: string): boolean {
  return TOKEN_REF.test(value.trim());
}

export type ShadowControlMode = 'token' | 'custom';

export function inferShadowMode(value: string): ShadowControlMode {
  const trimmed = value.trim();
  if (!trimmed) return 'custom';
  return isShadowTokenRef(trimmed) ? 'token' : 'custom';
}

export function isShadowStyleProperty(property: string): boolean {
  const name = property.trim().toLowerCase();
  return KNOWN_SHADOW_STYLE_PROPERTIES.has(name);
}

/** Value shown in custom mode (token refs are not valid CSS shadow strings). */
export function customShadowDraft(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || isShadowTokenRef(trimmed)) return '';
  return trimmed;
}
