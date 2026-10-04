import { DocumentError } from '../../document/errors.js';
import type { StyleRule } from '../../schema/document.js';

const CLASS_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const CLASS_CHAR = /[A-Za-z0-9_-]/;

/** Validate the portable, local subset of CSS selectors used by authored style rules. */
export function assertStyleSelector(selector: string): void {
  if (typeof selector !== 'string' || !selector.trim()) {
    throw new DocumentError('schema', 'A style rule needs a selector');
  }
  if (/:([A-Za-z_-][A-Za-z0-9_-]*)\(\s*\)/.test(stripAttributeStrings(selector))) invalidSelector();
  const syntaxText = stripAttributeStrings(selector);
  if (/\(\s*,|,\s*(?:,|\))|:::/.test(syntaxText)) invalidSelector();
  let quote = '';
  let escaped = false;
  let brackets = 0;
  let parens = 0;
  let groupHasToken = false;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index] ?? '';
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      if (brackets === 0 || !quote) invalidSelector();
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if ((char === '"' || char === "'") && brackets > 0) {
      quote = char;
      continue;
    }
    if ((char === '"' || char === "'") && brackets === 0) invalidSelector();
    if (char === '{' || char === '}' || char === ';' || char === '@') invalidSelector();
    if (brackets === 0 && /[!$%^&=`]/.test(char)) invalidSelector();
    if (
      (char === '/' && selector[index + 1] === '*') ||
      (char === '*' && selector[index + 1] === '/')
    ) {
      invalidSelector();
    }
    if (char === '?' && brackets === 0) invalidSelector();
    if (char === ':' && brackets === 0) {
      const pseudo = selector.slice(index + 1).match(/^([A-Za-z_-][A-Za-z0-9_-]*)/)?.[1];
      if (pseudo && /^(global|local)$/i.test(pseudo)) invalidSelector();
      if (!pseudo && selector[index + 1] !== ':') invalidSelector();
    }
    if (char === '#' && brackets === 0 && !/[A-Za-z_]/.test(selector[index + 1] ?? '')) {
      invalidSelector();
    }
    if (char === '[') {
      brackets += 1;
      groupHasToken = true;
      continue;
    }
    if (char === ']') {
      if (brackets === 0) invalidSelector();
      brackets -= 1;
      continue;
    }
    if (char === '(') {
      parens += 1;
      groupHasToken = true;
      continue;
    }
    if (char === ')') {
      if (parens === 0) invalidSelector();
      parens -= 1;
      continue;
    }
    if (char === ',' && brackets === 0 && parens === 0) {
      if (!groupHasToken || isTopLevelCombinator(lastNonSpace(selector, index))) invalidSelector();
      groupHasToken = false;
      continue;
    }
    if (brackets === 0 && parens === 0 && isTopLevelCombinator(char)) {
      if (!groupHasToken || hasPreviousTopLevelCombinator(selector, index)) invalidSelector();
    }
    if (!/\s|[>+~|]/.test(char)) groupHasToken = true;
    if (char === '.' && brackets === 0) {
      const first = selector[index + 1] ?? '';
      if (!/[A-Za-z_]/.test(first)) invalidSelector();
    }
  }
  if (
    escaped ||
    quote ||
    brackets !== 0 ||
    parens !== 0 ||
    !groupHasToken ||
    isTopLevelCombinator(selector.trim().slice(-1))
  )
    invalidSelector();
  // Run the token scanner too so unsupported escaped class identifiers fail consistently.
  selectorClassNames(selector);
}

/** Return distinct class tokens in first-use order, ignoring dots inside attribute strings. */
export function selectorClassNames(selector: string): string[] {
  const classes: string[] = [];
  const seen = new Set<string>();
  let quote = '';
  let escaped = false;
  let brackets = 0;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index] ?? '';
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if ((char === '"' || char === "'") && brackets > 0) {
      quote = char;
      continue;
    }
    if (char === '[') {
      brackets += 1;
      continue;
    }
    if (char === ']') {
      brackets -= 1;
      continue;
    }
    if (char !== '.' || brackets > 0) continue;
    const first = selector[index + 1] ?? '';
    if (!/[A-Za-z_]/.test(first)) continue;
    let end = index + 2;
    while (end < selector.length && CLASS_CHAR.test(selector[end] ?? '')) end += 1;
    const name = selector.slice(index + 1, end);
    if (!CLASS_NAME.test(name)) invalidSelector();
    if (!seen.has(name)) {
      seen.add(name);
      classes.push(name);
    }
    index = end - 1;
  }
  return classes;
}

/** Bind every authored class reference to a node, rejecting missing or extra bindings. */
export function bindStyleRuleSelector(
  selector: string,
  names: ReadonlyMap<string, string>,
): Record<string, string> {
  assertStyleSelector(selector);
  const classes = selectorClassNames(selector);
  const bindings = Object.create(null) as Record<string, string>;
  for (const name of classes) {
    const nodeId = [...names.entries()].find(([, className]) => className === name)?.[0];
    if (!nodeId) throw new DocumentError('schema', `Unknown selector class ".${name}"`);
    Object.defineProperty(bindings, name, {
      value: nodeId,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return bindings;
}

function isTopLevelCombinator(char: string) {
  return char === '>' || char === '+' || char === '~';
}

function lastNonSpace(value: string, before: number) {
  for (let index = before - 1; index >= 0; index -= 1) {
    const char = value[index] ?? '';
    if (!/\s/.test(char)) return char;
  }
  return '';
}

function stripAttributeStrings(selector: string) {
  let result = '';
  let quote = '';
  let escaped = false;
  let brackets = 0;
  for (const char of selector) {
    if (escaped) {
      escaped = false;
      result += brackets > 0 && quote ? ' ' : char;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      result += brackets > 0 && quote ? ' ' : char;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      result += ' ';
      continue;
    }
    if ((char === '"' || char === "'") && brackets > 0) {
      quote = char;
      result += ' ';
      continue;
    }
    if (char === '[') brackets += 1;
    else if (char === ']') brackets -= 1;
    result += char;
  }
  return result;
}

function hasPreviousTopLevelCombinator(selector: string, index: number) {
  let quote = '';
  let brackets = 0;
  let parens = 0;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const char = selector[cursor] ?? '';
    if (quote) {
      if (char === quote && selector[cursor - 1] !== '\\') quote = '';
      continue;
    }
    if ((char === '"' || char === "'") && brackets > 0) {
      quote = char;
      continue;
    }
    if (char === ']') brackets += 1;
    else if (char === '[') brackets -= 1;
    else if (char === ')') parens += 1;
    else if (char === '(') parens -= 1;
    if (brackets === 0 && parens === 0 && !/\s/.test(char)) {
      return isTopLevelCombinator(char);
    }
  }
  return false;
}

/** Re-render an authored selector after a bound node's readable class name changes. */
export function renderStyleRuleSelector(
  rule: Pick<StyleRule, 'selector' | 'bindings'>,
  names: ReadonlyMap<string, string>,
) {
  return replaceSelectorClasses(rule.selector, (name) => {
    const nodeId = Object.hasOwn(rule.bindings, name) ? rule.bindings[name] : undefined;
    const current = nodeId ? names.get(nodeId) : undefined;
    if (!current)
      throw new DocumentError('schema', `Style selector binding ".${name}" is dangling`);
    return current;
  });
}

/** Replace only parsed class identifiers; attribute values and quoted text stay untouched. */
export function replaceSelectorClasses(
  selector: string,
  replace: (className: string) => string,
): string {
  assertStyleSelector(selector);
  let output = '';
  let quote = '';
  let escaped = false;
  let brackets = 0;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index] ?? '';
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      output += char;
      escaped = true;
      continue;
    }
    if (quote) {
      output += char;
      if (char === quote) quote = '';
      continue;
    }
    if ((char === '"' || char === "'") && brackets > 0) {
      output += char;
      quote = char;
      continue;
    }
    if (char === '[') brackets += 1;
    else if (char === ']') brackets -= 1;
    if (char === '.' && brackets === 0 && /[A-Za-z_]/.test(selector[index + 1] ?? '')) {
      let end = index + 2;
      while (end < selector.length && CLASS_CHAR.test(selector[end] ?? '')) end += 1;
      const className = selector.slice(index + 1, end);
      output += `.${replace(className)}`;
      index = end - 1;
    } else output += char;
  }
  return output;
}

function invalidSelector(): never {
  throw new DocumentError('schema', 'Invalid style selector syntax');
}
