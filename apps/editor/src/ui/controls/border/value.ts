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

/** Return a uniform value only when all four corners are identical. */
export function uniformRadiusValue(
  value: Extract<BorderRadiusValue, { mode: 'corners' }>,
): string | null {
  const { topLeft, topRight, bottomRight, bottomLeft } = value;
  const normalized = [topLeft, topRight, bottomRight, bottomLeft].map((part) => part.trim());
  const first = normalized[0] ?? '';
  return normalized.every((part) => part === first) ? first : null;
}

/** Expand the CSS 1–4 value radius shorthand without discarding its order. */
export function expandRadiusValue(value: string): Extract<BorderRadiusValue, { mode: 'corners' }> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { mode: 'corners', topLeft: '', topRight: '', bottomRight: '', bottomLeft: '' };
  }
  const slash = findTopLevelSlash(trimmed);
  const horizontalText = slash === -1 ? trimmed : trimmed.slice(0, slash).trim();
  const verticalText = slash === -1 ? undefined : trimmed.slice(slash + 1).trim();
  const expand = (text: string): string[] => {
    const parts = splitCssValues(text);
    if (parts.length === 1) return [parts[0]!, parts[0]!, parts[0]!, parts[0]!];
    if (parts.length === 2) return [parts[0]!, parts[1]!, parts[0]!, parts[1]!];
    if (parts.length === 3) return [parts[0]!, parts[1]!, parts[2]!, parts[1]!];
    return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
  };
  const horizontal = expand(horizontalText ?? '');
  const vertical = verticalText ? expand(verticalText) : horizontal;
  return {
    mode: 'corners',
    topLeft: verticalText ? `${horizontal[0]} ${vertical[0]}` : horizontal[0]!,
    topRight: verticalText ? `${horizontal[1]} ${vertical[1]}` : horizontal[1]!,
    bottomRight: verticalText ? `${horizontal[2]} ${vertical[2]}` : horizontal[2]!,
    bottomLeft: verticalText ? `${horizontal[3]} ${vertical[3]}` : horizontal[3]!,
  };
}

function splitCssValues(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of value.trim()) {
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);
    if (/\s/.test(character) && depth === 0) {
      if (current) parts.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function findTopLevelSlash(value: string): number {
  let depth = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '(') depth += 1;
    else if (character === ')') depth = Math.max(0, depth - 1);
    else if (character === '/' && depth === 0) return index;
  }
  return -1;
}

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
  'border-radius',
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
  const shorthand = declarations.border ?? declarations['border'];
  const shorthandValue = shorthand ? parseBorderShorthand(shorthand) : null;
  const width = declarations.borderWidth ?? declarations['border-width'] ?? shorthandValue?.width;
  const style = declarations.borderStyle ?? declarations['border-style'] ?? shorthandValue?.style;
  const color = declarations.borderColor ?? declarations['border-color'] ?? shorthandValue?.color;
  if (width || style || color) {
    return {
      width: width ?? '',
      style: style ?? 'solid',
      color: color ?? '',
    };
  }
  if (shorthandValue) return shorthandValue;
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
  const shorthand = declarations.borderRadius ?? declarations['border-radius'];
  const expanded = shorthand ? expandRadiusValue(shorthand) : null;
  const topLeft =
    declarations.borderTopLeftRadius ??
    declarations['border-top-left-radius'] ??
    expanded?.topLeft ??
    '';
  const topRight =
    declarations.borderTopRightRadius ??
    declarations['border-top-right-radius'] ??
    expanded?.topRight ??
    '';
  const bottomRight =
    declarations.borderBottomRightRadius ??
    declarations['border-bottom-right-radius'] ??
    expanded?.bottomRight ??
    '';
  const bottomLeft =
    declarations.borderBottomLeftRadius ??
    declarations['border-bottom-left-radius'] ??
    expanded?.bottomLeft ??
    '';
  if (topLeft || topRight || bottomRight || bottomLeft) {
    const corners: Extract<BorderRadiusValue, { mode: 'corners' }> = {
      mode: 'corners',
      topLeft,
      topRight,
      bottomRight,
      bottomLeft,
    };
    const uniform = uniformRadiusValue(corners);
    return uniform ? { mode: 'uniform', value: uniform } : corners;
  }
  if (expanded) {
    const uniform = uniformRadiusValue(expanded);
    return uniform ? { mode: 'uniform', value: uniform } : expanded;
  }
  return null;
}

export function serializeBorderRadius(radius: BorderRadiusValue): Record<string, string> {
  if (radius.mode === 'uniform') {
    const value = radius.value.trim();
    return value ? { borderRadius: value } : {};
  }
  const values = {
    topLeft: radius.topLeft.trim(),
    topRight: radius.topRight.trim(),
    bottomRight: radius.bottomRight.trim(),
    bottomLeft: radius.bottomLeft.trim(),
  };
  const unique = [...new Set(Object.values(values))];
  if (unique.length === 1) return unique[0] ? { borderRadius: unique[0] } : {};
  if (unique.length === 2) {
    const counts = new Map(unique.map((value) => [value, 0]));
    for (const value of Object.values(values)) {
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const common = unique.find((value) => counts.get(value) === 3);
    const outlier = unique.find((value) => counts.get(value) === 1);
    if (common && outlier) {
      const result: Record<string, string> = common ? { borderRadius: common } : {};
      for (const [side, value] of Object.entries(values)) {
        if (value === outlier)
          result[`border${side[0]!.toUpperCase()}${side.slice(1)}Radius`] = value;
      }
      return result;
    }
  }
  const out: Record<string, string> = {};
  if (values.topLeft) out.borderTopLeftRadius = values.topLeft;
  if (values.topRight) out.borderTopRightRadius = values.topRight;
  if (values.bottomRight) out.borderBottomRightRadius = values.bottomRight;
  if (values.bottomLeft) out.borderBottomLeftRadius = values.bottomLeft;
  return out;
}

export function borderDeclarationKeys(): readonly string[] {
  return [...BORDER_KEYS];
}

export function borderRadiusDeclarationKeys(): readonly string[] {
  return [...RADIUS_KEYS];
}
