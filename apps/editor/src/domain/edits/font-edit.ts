import { assertFont, createCatalogUuid, type FontFamily } from '@facadeur/core';

const GENERIC_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'emoji',
  'math',
  'fangsong',
]);

function splitList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export type FontPatch = {
  label?: string;
  family?: string;
  fallbacks?: string[];
  weights?: number[];
};

export function createDefaultFont(label: string): FontFamily {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) throw new Error('Font label is required');
  const font: FontFamily = {
    uuid: createCatalogUuid(),
    label: trimmedLabel,
    group: '',
    valueType: 'fontFamily',
    value: {
      family: 'system-ui',
      weights: [400, 600],
      source: { type: 'system' },
      fallbacks: ['sans-serif'],
    },
  };
  assertFont(font);
  return font;
}

export function parseFontWeights(text: string): number[] {
  const parts = splitList(text);
  if (!parts.length) throw new Error('At least one weight is required');
  const weights: number[] = [];
  for (const part of parts) {
    const weight = Number(part);
    if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
      throw new Error(`Invalid weight "${part}"`);
    }
    if (weights.includes(weight)) throw new Error(`Duplicate weight ${weight}`);
    weights.push(weight);
  }
  return weights;
}

export function parseFontFallbacks(text: string): string[] {
  const fallbacks = splitList(text);
  if (!fallbacks.length) throw new Error('At least one fallback is required');
  const last = fallbacks[fallbacks.length - 1];
  if (!last || !GENERIC_FAMILIES.has(last.toLowerCase())) {
    throw new Error('The last fallback must be a generic family such as sans-serif');
  }
  return fallbacks;
}

export function editedFont(font: FontFamily, patch: FontPatch): FontFamily {
  const family = patch.family ?? font.value.family;
  const fallbacks = patch.fallbacks ? [...patch.fallbacks] : [...font.value.fallbacks];
  const weights = patch.weights ? [...patch.weights] : [...font.value.weights];
  const next: FontFamily = {
    uuid: font.uuid,
    label: patch.label ?? font.label,
    group: font.group,
    valueType: 'fontFamily',
    value: {
      ...font.value,
      family,
      weights,
      fallbacks,
      source:
        font.value.source.type === 'file'
          ? { type: 'file', files: font.value.source.files.map((file) => ({ ...file })) }
          : { type: 'system' },
    },
    ...(font.extensions ? { extensions: font.extensions } : {}),
  };
  assertFont(next);
  return next;
}

export function formatFontWeightList(weights: readonly number[]): string {
  const names: Record<number, string> = {
    100: 'Thin',
    200: 'Extra light',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'Semibold',
    700: 'Bold',
    800: 'Extra bold',
    900: 'Black',
  };
  return weights
    .map((weight) => (names[weight] ? `${names[weight]} ${weight}` : String(weight)))
    .join(', ');
}
