/** Constrain every selector group to one owner root or any descendant of it. */
export function scopeStyleSelector(selector: string, ownerRootSelector: string): string {
  const ownerScope = `:where(${ownerRootSelector}, ${ownerRootSelector} *)`;
  return mapSelectorGroups(selector, (group) => appendBeforePseudoElement(group, ownerScope));
}

/** Add a pseudo-class to each group, keeping it before a terminal pseudo-element. */
export function appendStyleSelectorSuffix(selector: string, suffix: string): string {
  return mapSelectorGroups(selector, (group) => appendBeforePseudoElement(group, suffix));
}

function appendBeforePseudoElement(selector: string, suffix: string): string {
  const index = topLevelPseudoElement(selector);
  return index < 0
    ? `${selector}${suffix}`
    : `${selector.slice(0, index)}${suffix}${selector.slice(index)}`;
}

function topLevelPseudoElement(selector: string): number {
  let quote = '';
  let escaped = false;
  let brackets = 0;
  let parens = 0;
  for (let index = 0; index < selector.length - 1; index += 1) {
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
    if (char === '[') brackets += 1;
    else if (char === ']') brackets -= 1;
    else if (char === '(') parens += 1;
    else if (char === ')') parens -= 1;
    else if (char === ':' && brackets === 0 && parens === 0) {
      if (selector[index + 1] === ':') return index;
      if (/^:(?:before|after|first-line|first-letter)\b/i.test(selector.slice(index))) return index;
    }
  }
  return -1;
}

function mapSelectorGroups(selector: string, map: (group: string) => string): string {
  const groups: string[] = [];
  let start = 0;
  let quote = '';
  let escaped = false;
  let brackets = 0;
  let parens = 0;
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
    if (char === '[') brackets += 1;
    else if (char === ']') brackets -= 1;
    else if (char === '(') parens += 1;
    else if (char === ')') parens -= 1;
    else if (char === ',' && brackets === 0 && parens === 0) {
      groups.push(map(selector.slice(start, index).trim()));
      start = index + 1;
    }
  }
  groups.push(map(selector.slice(start).trim()));
  return groups.join(', ');
}
