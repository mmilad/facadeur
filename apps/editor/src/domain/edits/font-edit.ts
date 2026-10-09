import { assertFont, createCatalogUuid, type FontFamily } from '@facadeur/core';
import { splitList } from '../definitions';

const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif',
  'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong',
]);

export type FontPatch = {
  label?: string;
  family?: string;
  googleFamily?: string;
  fallbacks?: string[];
  weights?: number[];
};

export function createDefaultFont(label: string): FontFamily {
  const family = label.trim();
  if (!family) throw new Error('Font label is required');
  const font: FontFamily = {
    uuid: createCatalogUuid(),
    label: family,
    group: '',
    valueType: 'fontFamily',
    value: {
      family,
      weights: [400, 600],
      source: { type: 'google', family },
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
    ...font,
    label: patch.label ?? font.label,
    value: {
      ...font.value,
      family,
      weights,
      fallbacks,
      source:
        font.value.source.type === 'google'
          ? { type: 'google', family: patch.googleFamily ?? patch.family ?? font.value.source.family }
          : { type: 'file', files: font.value.source.files.map((file) => ({ ...file })) },
    },
  };
  assertFont(next);
  return next;
}

export function formatFontWeightList(weights: readonly number[]): string {
  const names: Record<number, string> = {
    100: 'Thin', 200: 'Extra light', 300: 'Light', 400: 'Regular', 500: 'Medium',
    600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black',
  };
  return weights.map((weight) => names[weight] ? `${names[weight]} ${weight}` : String(weight)).join(', ');
}
