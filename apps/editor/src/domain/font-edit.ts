import { assertFont, isFontFamilyRef, readTokenTree, type FontFamily } from '@facadeur/core';
import { splitList } from './definitions.js';

const FONT_ID = /^[a-z][a-z0-9]*$/;
const FONT_REF_IN_TEXT = /\{font\.([a-z][a-z0-9]*)\}/g;

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

export function isValidFontId(id: string): boolean {
  return FONT_ID.test(id);
}

export function fontFamilyRef(id: string): string {
  return `{font.${id}}`;
}

export function suggestFontId(existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has('font')) return 'font';
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `font${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not find an unused font id');
}

export function createDefaultFont(id: string): FontFamily {
  assertFontId(id);
  const family = id;
  return {
    id,
    family,
    weights: [400, 600],
    source: { type: 'google', family },
    fallbacks: ['sans-serif'],
  };
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

export function tokenPathsReferencingFont(tree: unknown, fontId: string): string[] {
  const ref = fontFamilyRef(fontId);
  const indexed = readTokenTree(tree);
  const paths: string[] = [];
  for (const token of indexed.tokens.values()) {
    if (valueReferencesFontRef(token.value, ref)) paths.push(token.path);
    for (const override of Object.values(token.breakpoints)) {
      if (valueReferencesFontRef(override, ref)) {
        if (!paths.includes(token.path)) paths.push(token.path);
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function valueReferencesFontRef(value: unknown, ref: string): boolean {
  if (typeof value === 'string') {
    if (value === ref) return true;
    for (const match of value.matchAll(FONT_REF_IN_TEXT)) {
      const path = `font.${match[1] ?? ''}`;
      if (isFontFamilyRef(path) && `{${path}}` === ref) return true;
    }
    return false;
  }
  if (Array.isArray(value)) return value.some((item) => valueReferencesFontRef(item, ref));
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => valueReferencesFontRef(item, ref));
  }
  return false;
}

export function editedFont(
  font: FontFamily,
  patch: {
    family?: string;
    googleFamily?: string;
    fallbacks?: string[];
    weights?: number[];
  },
): FontFamily {
  const family = patch.family ?? font.family;
  const fallbacks = patch.fallbacks ? [...patch.fallbacks] : [...font.fallbacks];
  const weights = patch.weights ? [...patch.weights] : [...font.weights];
  const next: FontFamily = {
    id: font.id,
    family,
    weights,
    ...(font.styles ? { styles: [...font.styles] } : {}),
    source:
      font.source.type === 'google'
        ? {
            type: 'google',
            family: patch.googleFamily ?? patch.family ?? font.source.family,
          }
        : {
            type: 'file',
            files: font.source.files.map((file) => ({ ...file })),
          },
    fallbacks,
  };
  assertFont(next);
  return next;
}

export function assertFontId(id: string): void {
  const trimmed = id.trim();
  if (!isValidFontId(trimmed)) {
    throw new Error('Font id must start with a letter and use only lowercase letters and digits');
  }
}
