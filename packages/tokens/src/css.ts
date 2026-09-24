import { fontStyles, type FontFamily, type FontStyle } from '@facadeur/core';
import { loadTokens, quoteFamily, type DesignInput, type ResolvedDesign } from './resolve.js';

export interface CssOptions {
  /** Selector for the custom properties. Defaults to `:root`. */
  selector?: string;
}

/** Load tokens and fonts and emit one stylesheet. */
export function renderDesignCss(input: DesignInput = {}, options: CssOptions = {}): string {
  return renderResolvedCss(loadTokens(input), options.selector ?? ':root');
}

export function renderResolvedCss(design: ResolvedDesign, selector = ':root'): string {
  const chunks: string[] = [];
  for (const font of design.fonts) {
    if (font.source.type === 'google') chunks.push(`@import url("${googleFontUrl(font)}");`);
  }
  for (const font of design.fonts) {
    if (font.source.type === 'file') chunks.push(...fontFaceRules(font));
  }
  const base = design.properties
    .filter((property) => property.value !== '')
    .map((property) => [property.name, property.value] as [string, string]);
  if (base.length) chunks.push(rule(selector, base));

  const baseId = design.breakpoints[0]?.id;
  for (const breakpoint of design.breakpoints) {
    if (breakpoint.id === baseId) continue;
    const declarations = design.properties.flatMap((property) => {
      const value = property.breakpoints[breakpoint.id];
      return value === undefined ? [] : [[property.name, value] as [string, string]];
    });
    if (!declarations.length) continue;
    chunks.push(
      `@media (min-width: ${breakpoint.minWidth}px) {\n${rule(selector, declarations, 1)}\n}`,
    );
  }
  return `${chunks.join('\n\n')}\n`;
}

export function googleFontUrl(font: FontFamily): string {
  if (font.source.type !== 'google') {
    throw new Error(`Font "${font.id}" is not a Google font`);
  }
  const family = encodeURIComponent(font.source.family).replace(/%20/g, '+');
  const weights = [...font.weights].sort((left, right) => left - right);
  const styles = fontStyles(font);
  const axis = styles.includes('italic')
    ? `ital,wght@${italicPairs(styles, weights).join(';')}`
    : `wght@${weights.join(';')}`;
  return `https://fonts.googleapis.com/css2?family=${family}:${axis}&display=swap`;
}

function italicPairs(styles: readonly FontStyle[], weights: readonly number[]): string[] {
  const pairs: string[] = [];
  for (const style of ['normal', 'italic'] as const) {
    if (!styles.includes(style)) continue;
    const italic = style === 'italic' ? 1 : 0;
    for (const weight of weights) pairs.push(`${italic},${weight}`);
  }
  return pairs;
}

function fontFaceRules(font: FontFamily): string[] {
  if (font.source.type !== 'file') return [];
  return font.source.files.map((file) => {
    const format = file.format ? ` format("${escapeCss(file.format)}")` : '';
    return [
      '@font-face {',
      `  font-family: ${quoteFamily(font.family)};`,
      `  font-style: ${file.style};`,
      `  font-weight: ${file.weight};`,
      `  src: url("${escapeCss(file.url)}")${format};`,
      '}',
    ].join('\n');
  });
}

function rule(selector: string, declarations: readonly [string, string][], indent = 0): string {
  const pad = '  '.repeat(indent);
  const body = declarations.map(([name, value]) => `${pad}  ${name}: ${value};`).join('\n');
  return `${pad}${selector} {\n${body}\n${pad}}`;
}

function escapeCss(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
