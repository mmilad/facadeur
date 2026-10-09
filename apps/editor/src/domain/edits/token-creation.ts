import { createCatalogUuid, type DesignTokenFamily, type DesignTokenRecord, type DesignTokenValue, type DesignTokenValueType } from '@facadeur/core';

export function suggestedTokenPath(
  label: string,
  family: DesignTokenFamily,
  existingPaths: ReadonlySet<string>,
): string {
  const segments = label.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!segments.length) throw new Error('Label is required');
  if (segments.length > 1 && segments[segments.length - 1] === family) segments.pop();
  const base = [family, ...segments].join('.');
  if (!existingPaths.has(base)) return base;
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${base}${index}`;
    if (!existingPaths.has(candidate)) return candidate;
  }
  throw new Error(`Could not suggest a ${family} token name`);
}

export function tokenMetadataFromPath(path: string, family: DesignTokenFamily) {
  const [, ...parts] = path.split('.');
  const label = parts.pop();
  if (!label) throw new Error('Token label is required');
  return {
    label: label.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    group: parts.join('.'),
  };
}

export function defaultTokenValue(family: DesignTokenFamily): {
  valueType: DesignTokenValueType;
  value: DesignTokenValue;
} {
  switch (family) {
    case 'color':
      return { valueType: 'color', value: '#000000' };
    case 'space':
      return { valueType: 'dimension', value: '16px' };
    case 'radius':
      return { valueType: 'dimension', value: '8px' };
    case 'shadow':
      return {
        valueType: 'shadow',
        value: { offsetX: '0px', offsetY: '1px', blur: '2px', spread: '0px', color: '#00000014' },
      };
    case 'type':
      return {
        valueType: 'typography',
        value: {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontWeight: 400,
          letterSpacing: '0',
          lineHeight: 1.5,
        },
      };
    case 'font':
      return {
        valueType: 'fontFamily',
        value: {
          family: 'Inter',
          weights: [400, 600],
          source: { type: 'google', family: 'Inter' },
          fallbacks: ['sans-serif'],
        },
      };
  }
}

/** UUIDs are created only at the editor's new-token boundary; imported/example IDs stay static. */
export function createDesignToken(
  family: DesignTokenFamily,
  label: string,
  group: string,
  valueType: DesignTokenValueType,
  value: DesignTokenValue,
): DesignTokenRecord {
  const trimmedLabel = label.trim();
  const trimmedGroup = group.trim();
  if (!trimmedLabel) throw new Error('Token label is required');
  if (trimmedGroup !== group) throw new Error('Token group must not have surrounding whitespace');
  if (family === 'font' && valueType !== 'fontFamily') {
    throw new Error('Font tokens must use the fontFamily value type');
  }
  return {
    uuid: createCatalogUuid(),
    label: trimmedLabel,
    group: trimmedGroup,
    valueType,
    value,
  };
}
