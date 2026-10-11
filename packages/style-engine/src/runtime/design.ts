import type { ResolvedDesign } from '@facadeur/core';
import { compileDesignRules } from '../design/css';

export function insertDesign(
  sheet: CSSStyleSheet,
  design: ResolvedDesign,
  selector: string,
): CSSRule[] {
  return compileDesignRules(design, selector).map((text, index) => {
    sheet.insertRule(text, index);
    const rule = sheet.cssRules[index];
    if (!rule) throw new Error(`Could not insert design rule: ${text.slice(0, 80)}`);
    return rule;
  });
}
