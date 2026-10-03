import type { FontFamily } from '@facadeur/core';
import { googleFontUrl, quoteFamily, type ResolvedDesign } from '@facadeur/tokens';
import { cssString } from '../css/strings';
import { declarationsText } from '../css/declarations';
import { insertAt } from './stylesheet';
export function insertDesign(
  sheet: CSSStyleSheet,
  design: ResolvedDesign,
  selector: string,
): CSSRule[] {
  const created: CSSRule[] = [];
  let index = 0;
  for (const font of design.fonts) {
    if (font.source.type !== 'google') continue;
    const rule = insertAt(sheet, `@import url("${cssString(googleFontUrl(font))}");`, index);
    created.push(rule);
    index += 1;
  }
  for (const font of design.fonts) {
    if (font.source.type !== 'file') continue;
    for (const text of fontFaceTexts(font)) {
      created.push(insertAt(sheet, text, index));
      index += 1;
    }
  }
  const base = design.properties
    .filter((property) => property.value !== '')
    .map((property) => [property.name, property.value] as [string, string]);
  if (base.length) {
    created.push(insertAt(sheet, `${selector} {${declarationsText(base)}}`, index));
    index += 1;
  }
  const baseId = design.breakpoints[0]?.id;
  for (const breakpoint of design.breakpoints) {
    if (breakpoint.id === baseId) continue;
    const declarations = design.properties.flatMap((property) => {
      const value = property.breakpoints[breakpoint.id];
      return value === undefined ? [] : [[property.name, value] as [string, string]];
    });
    if (!declarations.length) continue;
    const text = `@media (min-width: ${breakpoint.minWidth}px) { ${selector} {${declarationsText(declarations)}} }`;
    created.push(insertAt(sheet, text, index));
    index += 1;
  }
  return created;
}

function fontFaceTexts(font: FontFamily): string[] {
  if (font.source.type !== 'file') return [];
  return font.source.files.map((file) => {
    const format = file.format ? ` format("${cssString(file.format)}")` : '';
    return `@font-face { font-family: ${quoteFamily(font.family)}; font-style: ${file.style}; font-weight: ${file.weight}; src: url("${cssString(file.url)}")${format}; }`;
  });
}
