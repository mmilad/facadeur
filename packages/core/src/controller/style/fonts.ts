import { DocumentError } from '../../document/errors';
import type { FontFamily, FontFaceFile, FontStyle } from '../../schema/document';
import { UUID_PATTERN } from '../../document/ids';

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

export function cloneFont(font: FontFamily): FontFamily {
  return structuredClone(font);
}

export function assertFonts(fonts: readonly FontFamily[]): void {
  const uuids = new Set<string>();
  for (const font of fonts) {
    assertFont(font);
    if (uuids.has(font.uuid)) throw new DocumentError('schema', `Duplicate font "${font.uuid}"`);
    uuids.add(font.uuid);
  }
}

export function assertFont(font: FontFamily): void {
  const fontLabel = `Font "${font.uuid}"`;
  if (!UUID_PATTERN.test(font.uuid)) throw new DocumentError('schema', `${fontLabel} has an invalid UUID`);
  if (font.valueType !== 'fontFamily') throw new DocumentError('schema', `${fontLabel} must use fontFamily valueType`);
  if (!font.label.trim() || font.group.trim() !== font.group) {
    throw new DocumentError('schema', `${fontLabel} needs a label and a trimmed group`);
  }
  const value = font.value;
  assertCssString(value.family, `${fontLabel} family`);
  if (!value.weights.length) throw new DocumentError('schema', `${fontLabel} needs at least one weight`);
  const weights = new Set<number>();
  for (const weight of value.weights) {
    if (!Number.isInteger(weight) || weight < 1 || weight > 1000) {
      throw new DocumentError('schema', `${fontLabel} has an invalid weight ${weight}`);
    }
    if (weights.has(weight)) throw new DocumentError('schema', `${fontLabel} repeats weight ${weight}`);
    weights.add(weight);
  }
  const styles = value.styles?.length ? value.styles : (['normal'] as const);
  const seenStyles = new Set<string>();
  for (const style of styles) {
    if (style !== 'normal' && style !== 'italic') {
      throw new DocumentError('schema', `${fontLabel} has an invalid style "${style}"`);
    }
    if (seenStyles.has(style)) throw new DocumentError('schema', `${fontLabel} repeats style "${style}"`);
    seenStyles.add(style);
  }
  if (!value.fallbacks.length) throw new DocumentError('schema', `${fontLabel} needs at least one fallback`);
  for (const fallback of value.fallbacks) assertCssString(fallback, `${fontLabel} fallback`);
  const last = value.fallbacks[value.fallbacks.length - 1];
  if (!last || !GENERIC_FAMILIES.has(last.toLowerCase())) {
    throw new DocumentError('schema', `${fontLabel} must end its fallbacks with a generic family such as sans-serif`);
  }
  assertSource(font, styles);
}

export function fontStyles(font: FontFamily): FontStyle[] {
  return font.value.styles?.length ? [...font.value.styles] : ['normal'];
}

function assertSource(font: FontFamily, styles: readonly FontStyle[]) {
  const { source, weights } = font.value;
  const fontLabel = `Font "${font.uuid}"`;
  if (source.type === 'google') {
    assertCssString(source.family, `${fontLabel} Google family`);
    return;
  }
  if (source.type !== 'file') throw new DocumentError('schema', `${fontLabel} has an unknown source`);
  if (!source.files.length) throw new DocumentError('schema', `${fontLabel} needs at least one file`);
  for (const file of source.files) assertFaceFile(font.uuid, file);
  for (const weight of weights) {
    for (const style of styles) {
      if (!source.files.some((file) => file.weight === weight && file.style === style)) {
        throw new DocumentError('schema', `${fontLabel} has no file for weight ${weight} ${style}`);
      }
    }
  }
}

function assertFaceFile(uuid: string, file: FontFaceFile) {
  if (!Number.isInteger(file.weight) || file.weight < 1 || file.weight > 1000) {
    throw new DocumentError('schema', `Font "${uuid}" has an invalid file weight`);
  }
  if (file.style !== 'normal' && file.style !== 'italic') {
    throw new DocumentError('schema', `Font "${uuid}" has an invalid file style`);
  }
  assertCssString(file.url, `Font "${uuid}" file url`);
  if (file.format !== undefined) assertCssString(file.format, `Font "${uuid}" file format`);
}

function assertCssString(value: string, label: string) {
  if (typeof value !== 'string' || value.trim() === '' || /[\n\r";{}]/.test(value)) {
    throw new DocumentError('schema', `${label} must be a single CSS token`);
  }
}
