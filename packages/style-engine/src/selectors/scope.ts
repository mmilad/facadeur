/** Constrain every selector group to one owner root or any descendant of it. */
export function scopeStyleSelector(selector: string, ownerRootSelector: string): string {
  return appendStyleSelectorSuffix(
    selector,
    `:where(${ownerRootSelector}, ${ownerRootSelector} *)`,
  );
}

/** Add a suffix to each group before a terminal pseudo-element. */
export function appendStyleSelectorSuffix(selector: string, suffix: string): string {
  const groups: string[] = [];
  let start = 0;
  for (const index of topLevelIndexes(selector)) {
    if (selector[index] !== ',') continue;
    groups.push(appendBeforePseudoElement(selector.slice(start, index).trim(), suffix));
    start = index + 1;
  }
  groups.push(appendBeforePseudoElement(selector.slice(start).trim(), suffix));
  return groups.join(', ');
}

function appendBeforePseudoElement(selector: string, suffix: string): string {
  for (const index of topLevelIndexes(selector)) {
    if (selector[index] !== ':') continue;
    if (
      selector[index + 1] === ':' ||
      /^:(?:before|after|first-line|first-letter)\b/i.test(selector.slice(index))
    ) {
      return `${selector.slice(0, index)}${suffix}${selector.slice(index)}`;
    }
  }
  return `${selector}${suffix}`;
}

/** Skip attribute strings and functional pseudo arguments in both selector operations. */
function* topLevelIndexes(selector: string): Generator<number> {
  let quote = '';
  let escaped = false;
  let brackets = 0;
  let parens = 0;
  for (let index = 0; index < selector.length; index += 1) {
    const char = selector[index];
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
    else if (brackets === 0 && parens === 0) yield index;
  }
}
