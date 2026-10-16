import {
  loadTokens,
  quoteFamily,
  type DesignInput,
  type FontFamily,
  type ResolvedDesign,
} from '@facadeur/core';

export interface CssOptions {
  /** Selector for the custom properties. Defaults to `:root`. */
  selector?: string;
}

/** Load the UUID-keyed token set and emit one stylesheet. */
export function renderDesignCss(input: DesignInput = {}, options: CssOptions = {}): string {
  return renderResolvedCss(loadTokens(input), options.selector ?? ':root');
}

export function renderResolvedCss(design: ResolvedDesign, selector = ':root'): string {
  return `${compileDesignRules(design, selector).join('\n\n')}\n`;
}

/** Compile the shared font, base, and responsive rules used by CSS output and runtime injection. */
export function compileDesignRules(design: ResolvedDesign, selector = ':root'): string[] {
  const chunks: string[] = [];
  for (const font of design.fonts) {
    if (font.value.source.type === 'file') chunks.push(...fontFaceRules(font));
  }
  const base = design.properties
    .filter((property) => property.value !== '')
    .map((property) => [property.name, property.value] as [string, string]);
  if (base.length) chunks.push(rule(selector, base));

  const baseId = design.breakpoints[0]?.uuid;
  for (const breakpoint of design.breakpoints) {
    if (breakpoint.uuid === baseId) continue;
    const declarations = design.properties.flatMap((property) => {
      const value = property.breakpoints[breakpoint.uuid];
      return value === undefined ? [] : [[property.name, value] as [string, string]];
    });
    if (!declarations.length) continue;
    chunks.push(
      `@media (min-width: ${breakpoint.minWidth}px) {\n${rule(selector, declarations, 1)}\n}`,
    );
  }
  return chunks;
}

function fontFaceRules(font: FontFamily): string[] {
  if (font.value.source.type !== 'file') return [];
  return font.value.source.files.map((file) => {
    const format = file.format ? ` format("${escapeCss(file.format)}")` : '';
    return [
      '@font-face {',
      `  font-family: ${quoteFamily(font.value.family)};`,
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
