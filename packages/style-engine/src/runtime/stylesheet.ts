import type { StyleOwner } from './types';
import type { CompiledRule } from '../compiler/types';
import { toKebab, declarationsText } from '../css/declarations';
export function appendStyleRule(
  owner: StyleOwner,
  selector: string,
  declarations: Record<string, string | number>,
): CSSStyleRule {
  const body = Object.entries(declarations)
    .map(([property, value]) => `${toKebab(property)}: ${value};`)
    .join('');
  const rule = insertAt(owner, `${selector} {${body}}`);
  if (!isStyleRule(rule)) {
    throw new Error(`Insert did not produce a style rule for ${selector}`);
  }
  return rule;
}

export function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return rule.type === CSSRule.STYLE_RULE;
}

export function indexOfRule(owner: StyleOwner, rule: CSSRule): number {
  for (let index = 0; index < owner.cssRules.length; index += 1) {
    if (owner.cssRules[index] === rule) return index;
  }
  return -1;
}

export function clearRules(sheet: CSSStyleSheet, rules: readonly CSSRule[]): void {
  for (const rule of rules) {
    const index = indexOfRule(sheet, rule);
    if (index >= 0) sheet.deleteRule(index);
  }
}

export function insertCompiled(sheet: CSSStyleSheet, compiled: CompiledRule): CSSRule {
  const body = declarationsText(compiled.declarations);
  if (compiled.minWidth === undefined) {
    return insertAt(sheet, `${compiled.selector} {${body}}`);
  }
  const media = insertAt(sheet, `@media (min-width: ${compiled.minWidth}px) {}`);
  if (media.type !== CSSRule.MEDIA_RULE) {
    throw new Error(`Could not insert @media for ${compiled.selector}`);
  }
  const group = media as CSSMediaRule;
  insertAt(group, `${compiled.selector} {${body}}`, 0);
  return group;
}

export function insertAt(owner: StyleOwner, text: string, index = owner.cssRules.length): CSSRule {
  owner.insertRule(text, index);
  const rule = owner.cssRules[index];
  if (!rule) throw new Error(`Could not insert rule: ${text.slice(0, 80)}`);
  return rule;
}
