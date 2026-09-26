const BORDER_STYLE = /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/i;

export const BORDER_STYLE_OPTIONS = [
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
] as const;

export type BorderValue = {
  width: string;
  style: string;
  color: string;
};

export type BorderRadiusValue =
  | { mode: 'uniform'; value: string }
  | { mode: 'corners'; topLeft: string; topRight: string; bottomRight: string; bottomLeft: string };

const BORDER_KEYS = new Set([
  'border',
  'borderWidth',
  'borderStyle',
  'borderColor',
  'border-width',
  'border-style',
  'border-color',
]);

const RADIUS_KEYS = new Set([
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
]);

export function isBorderDeclarationKey(property: string): boolean {
  return BORDER_KEYS.has(property);
}

export function isBorderRadiusDeclarationKey(property: string): boolean {
  return RADIUS_KEYS.has(property);
}

export function readBorder(declarations: Record<string, string>): BorderValue | null {
  const width = declarations.borderWidth ?? declarations['border-width'];
  const style = declarations.borderStyle ?? declarations['border-style'];
  const color = declarations.borderColor ?? declarations['border-color'];
  const shorthand = declarations.border;
  if (width || style || color) {
    return {
      width: width ?? '',
      style: style ?? 'solid',
      color: color ?? '',
    };
  }
  if (shorthand) return parseBorderShorthand(shorthand);
  return null;
}

export function parseBorderShorthand(value: string): BorderValue | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\S+)\s+(\S+)\s+(.+)$/);
  if (!match) return { width: trimmed, style: 'solid', color: '' };
  const width = match[1] ?? '';
  const style = match[2] ?? '';
  const color = match[3]?.trim() ?? '';
  if (!BORDER_STYLE.test(style)) return { width: trimmed, style: 'solid', color: '' };
  return { width, style: style.toLowerCase(), color };
}

export function serializeBorder(border: BorderValue): Record<string, string> {
  const width = border.width.trim();
  const style = border.style.trim() || 'solid';
  const color = border.color.trim();
  if (!width && !color && (!style || style === 'none')) {
    return {};
  }
  if (width && color) {
    return {
      borderWidth: width,
      borderStyle: style,
      borderColor: color,
    };
  }
  if (width && style) {
    return { border: `${width} ${style} ${color || 'transparent'}` };
  }
  const out: Record<string, string> = {};
  if (width) out.borderWidth = width;
  if (style) out.borderStyle = style;
  if (color) out.borderColor = color;
  return out;
}

export function readBorderRadius(declarations: Record<string, string>): BorderRadiusValue | null {
  const uniform = declarations.borderRadius;
  const topLeft = declarations.borderTopLeftRadius ?? declarations['border-top-left-radius'] ?? '';
  const topRight =
    declarations.borderTopRightRadius ?? declarations['border-top-right-radius'] ?? '';
  const bottomRight =
    declarations.borderBottomRightRadius ?? declarations['border-bottom-right-radius'] ?? '';
  const bottomLeft =
    declarations.borderBottomLeftRadius ?? declarations['border-bottom-left-radius'] ?? '';
  if (topLeft || topRight || bottomRight || bottomLeft) {
    return {
      mode: 'corners',
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    };
  }
  if (uniform) return { mode: 'uniform', value: uniform };
  return null;
}

export function serializeBorderRadius(radius: BorderRadiusValue): Record<string, string> {
  if (radius.mode === 'uniform') {
    const value = radius.value.trim();
    return value ? { borderRadius: value } : {};
  }
  const out: Record<string, string> = {};
  if (radius.topLeft.trim()) out.borderTopLeftRadius = radius.topLeft.trim();
  if (radius.topRight.trim()) out.borderTopRightRadius = radius.topRight.trim();
  if (radius.bottomRight.trim()) out.borderBottomRightRadius = radius.bottomRight.trim();
  if (radius.bottomLeft.trim()) out.borderBottomLeftRadius = radius.bottomLeft.trim();
  return out;
}

export function borderDeclarationKeys(): readonly string[] {
  return [...BORDER_KEYS];
}

export function borderRadiusDeclarationKeys(): readonly string[] {
  return [...RADIUS_KEYS];
}
