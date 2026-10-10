import type { ResolvedDesign } from '@facadeur/core';
import { compileDesignRules } from '../design/css';
import { insertAt } from './stylesheet';
export function insertDesign(
  sheet: CSSStyleSheet,
  design: ResolvedDesign,
  selector: string,
): CSSRule[] {
  return compileDesignRules(design, selector).map((text, index) => insertAt(sheet, text, index));
}
