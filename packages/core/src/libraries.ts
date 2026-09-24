import { DocumentError } from './errors.js';
import type { Breakpoint, FontFaceFile, FontFamily, FontSource, FontStyle } from './schema.js';

/** CSS generic families. A font stack must end on one so it always resolves. */
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

const FONT_ID = /^[a-z][a-z0-9]*$/;
const BREAKPOINT_ID = /^[a-z][a-z0-9]*$/;

export function cloneFont(font: FontFamily): FontFamily {
  const next: FontFamily = {
    id: font.id,
    family: font.family,
    weights: [...font.weights],
    source: cloneSource(font.source),
    fallbacks: [...font.fallbacks],
  };
  if (font.styles?.length) next.styles = [...font.styles];
  return next;
}

export function cloneFonts(fonts: readonly FontFamily[]): FontFamily[] {
  return fonts.map((font) => cloneFont(font));
}

export function cloneBreakpoints(breakpoints: readonly Breakpoint[]): Breakpoint[] {
  return breakpoints.map((breakpoint) => ({
    id: breakpoint.id,
    minWidth: breakpoint.minWidth,
  }));
}

export function assertFonts(fonts: readonly FontFamily[]): void {
  const ids = new Set<string>();
  for (const font of fonts) {
    assertFont(font);
    if (ids.has(font.id)) {
      throw new DocumentError('schema', `Duplicate font "${font.id}"`);
    }
    ids.add(font.id);
  }
}

export function assertFont(font: FontFamily): void {
  if (!FONT_ID.test(font.id)) {
    throw new DocumentError('schema', `Invalid font id "${font.id}"`);
  }
  assertCssString(font.family, `Font "${font.id}" family`);
  if (!font.weights.length) {
    throw new DocumentError('schema', `Font "${font.id}" needs at least one weight`);
  }
  const weights = new Set<number>();
  for (const weight of font.weights) {
    if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
      throw new DocumentError('schema', `Font "${font.id}" has an invalid weight ${weight}`);
    }
    if (weights.has(weight)) {
      throw new DocumentError('schema', `Font "${font.id}" repeats weight ${weight}`);
    }
    weights.add(weight);
  }
  const styles = font.styles?.length ? font.styles : (['normal'] as const);
  const seenStyles = new Set<string>();
  for (const style of styles) {
    if (style !== 'normal' && style !== 'italic') {
      throw new DocumentError('schema', `Font "${font.id}" has an invalid style "${style}"`);
    }
    if (seenStyles.has(style)) {
      throw new DocumentError('schema', `Font "${font.id}" repeats style "${style}"`);
    }
    seenStyles.add(style);
  }
  if (!font.fallbacks.length) {
    throw new DocumentError('schema', `Font "${font.id}" needs at least one fallback`);
  }
  for (const fallback of font.fallbacks) {
    assertCssString(fallback, `Font "${font.id}" fallback`);
  }
  const last = font.fallbacks[font.fallbacks.length - 1];
  if (!last || !GENERIC_FAMILIES.has(last.toLowerCase())) {
    throw new DocumentError(
      'schema',
      `Font "${font.id}" must end its fallbacks with a generic family such as sans-serif`,
    );
  }
  assertSource(font, styles);
}

export function assertBreakpoints(breakpoints: readonly Breakpoint[] | undefined): void {
  if (!breakpoints) return;
  if (!breakpoints.length) {
    throw new DocumentError('schema', 'Breakpoints must not be empty');
  }
  const ids = new Set<string>();
  const widths = new Map<number, string>();
  for (const breakpoint of breakpoints) {
    if (!BREAKPOINT_ID.test(breakpoint.id)) {
      throw new DocumentError('schema', `Invalid breakpoint id "${breakpoint.id}"`);
    }
    if (ids.has(breakpoint.id)) {
      throw new DocumentError('schema', `Duplicate breakpoint "${breakpoint.id}"`);
    }
    ids.add(breakpoint.id);
    if (!Number.isInteger(breakpoint.minWidth) || breakpoint.minWidth < 1) {
      throw new DocumentError(
        'schema',
        `Breakpoint "${breakpoint.id}" needs a positive integer min-width`,
      );
    }
    const existing = widths.get(breakpoint.minWidth);
    if (existing) {
      throw new DocumentError(
        'schema',
        `Breakpoints "${existing}" and "${breakpoint.id}" share the min-width ${breakpoint.minWidth}`,
      );
    }
    widths.set(breakpoint.minWidth, breakpoint.id);
  }
}

export function fontStyles(font: FontFamily): FontStyle[] {
  return font.styles?.length ? [...font.styles] : ['normal'];
}

function assertSource(font: FontFamily, styles: readonly FontStyle[]): void {
  const source = font.source;
  if (source.type === 'google') {
    assertCssString(source.family, `Font "${font.id}" Google family`);
    return;
  }
  if (source.type !== 'file') {
    throw new DocumentError('schema', `Font "${font.id}" has an unknown source`);
  }
  if (!source.files.length) {
    throw new DocumentError('schema', `Font "${font.id}" needs at least one file`);
  }
  for (const file of source.files) assertFaceFile(font.id, file);
  for (const weight of font.weights) {
    for (const style of styles) {
      const found = source.files.some((file) => file.weight === weight && file.style === style);
      if (!found) {
        throw new DocumentError(
          'schema',
          `Font "${font.id}" has no file for weight ${weight} ${style}`,
        );
      }
    }
  }
}

function assertFaceFile(id: string, file: FontFaceFile): void {
  if (!Number.isInteger(file.weight) || file.weight < 1 || file.weight > 1000) {
    throw new DocumentError('schema', `Font "${id}" has an invalid file weight`);
  }
  if (file.style !== 'normal' && file.style !== 'italic') {
    throw new DocumentError('schema', `Font "${id}" has an invalid file style`);
  }
  assertCssString(file.url, `Font "${id}" file url`);
  if (file.format !== undefined) assertCssString(file.format, `Font "${id}" file format`);
}

function assertCssString(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim() === '' || /[\n\r";{}]/.test(value)) {
    throw new DocumentError('schema', `${label} must be a single CSS token`);
  }
}

function cloneSource(source: FontSource): FontSource {
  if (source.type === 'google') return { type: 'google', family: source.family };
  return {
    type: 'file',
    files: source.files.map((file) => {
      const next: FontFaceFile = { weight: file.weight, style: file.style, url: file.url };
      if (file.format !== undefined) next.format = file.format;
      return next;
    }),
  };
}
