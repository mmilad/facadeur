import { canonicalStyleProperty } from '../edits/style-edit';

export type CssDeclarationsResult =
  | { ok: true; declarations: Record<string, string> }
  | { ok: false; error: { message: string; offset: number } };
type CommentMaskResult =
  { ok: true; text: string } | { ok: false; error: { message: string; offset: number } };

/** Parse a CSS declaration list while respecting strings, comments, and nested values. */
export function parseCssDeclarations(source: string): CssDeclarationsResult {
  const masked = maskComments(source);
  if (!masked.ok) return masked;

  const declarations: Record<string, string> = {};
  const delimiters: { value: string; offset: number }[] = [];
  let quote: '"' | "'" | null = null;
  let quoteStart = -1;
  let escaped = false;
  let declarationStart = 0;
  let colon = -1;

  for (let index = 0; index <= masked.text.length; index += 1) {
    const character = masked.text[index];
    if (index === masked.text.length) {
      if (quote) return syntaxError(source, quoteStart, 'Unterminated string.');
      if (delimiters.length) {
        const opening = delimiters.at(-1)!;
        return syntaxError(source, opening.offset, `Unclosed "${opening.value}".`);
      }
    }
    if (index === masked.text.length || (!quote && !delimiters.length && character === ';')) {
      const parsed = parseDeclaration(source, masked.text, declarationStart, index, colon);
      if (!parsed.ok) return parsed;
      if (parsed.declaration) declarations[parsed.declaration.property] = parsed.declaration.value;
      declarationStart = index + 1;
      colon = -1;
      continue;
    }

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      quoteStart = index;
      continue;
    }

    if (character === '(' || character === '[' || character === '{') {
      delimiters.push({ value: character, offset: index });
      continue;
    }

    if (character === ')' || character === ']' || character === '}') {
      const expected = character === ')' ? '(' : character === ']' ? '[' : '{';
      if (delimiters.at(-1)?.value !== expected) {
        return syntaxError(source, index, `Unexpected "${character}".`);
      }
      delimiters.pop();
      continue;
    }

    if (character === ':' && delimiters.length === 0 && colon < 0) colon = index;
  }

  return { ok: true, declarations };
}

export function formatCssDeclarations(declarations: Record<string, string>): string {
  return Object.entries(declarations)
    .map(([property, value]) => `${cssPropertyName(property)}: ${value};`)
    .join('\n');
}

function parseDeclaration(
  source: string,
  text: string,
  start: number,
  end: number,
  colon: number,
):
  | { ok: true; declaration?: { property: string; value: string } }
  | { ok: false; error: { message: string; offset: number } } {
  const content = text.slice(start, end);
  if (!content.trim()) return { ok: true };
  if (colon < start) return syntaxError(source, start, 'Expected a property followed by ":".');

  const property = text.slice(start, colon).trim();
  const value = text.slice(colon + 1, end).trim();
  if (!/^(?:--[A-Za-z0-9_-]+|[-_A-Za-z][A-Za-z0-9_-]*)$/.test(property)) {
    return syntaxError(source, start, 'Invalid CSS property name.');
  }
  if (!value) return syntaxError(source, colon + 1, 'Expected a value after ":".');

  // CSS property names are case-insensitive, while custom property names are not.
  const normalized = cssPropertyName(property);
  return { ok: true, declaration: { property: normalized, value } };
}

function cssPropertyName(property: string): string {
  return property.startsWith('--') ? property : canonicalStyleProperty(property);
}

function maskComments(source: string): CommentMaskResult {
  const chars = source.split('');
  let quote: '"' | "'" | null = null;
  let escaped = false;
  for (let index = 0; index < chars.length - 1; index += 1) {
    if (quote) {
      if (escaped) escaped = false;
      else if (chars[index] === '\\') escaped = true;
      else if (chars[index] === quote) quote = null;
      continue;
    }
    if (chars[index] === '"' || chars[index] === "'") {
      quote = chars[index] as '"' | "'";
      continue;
    }
    if (chars[index] !== '/' || chars[index + 1] !== '*') continue;
    const start = index;
    chars[index] = ' ';
    chars[index + 1] = ' ';
    index += 2;
    let closed = false;
    while (index < chars.length) {
      if (chars[index] === '*' && chars[index + 1] === '/') {
        chars[index] = ' ';
        chars[index + 1] = ' ';
        index += 1;
        closed = true;
        break;
      }
      if (chars[index] !== '\n' && chars[index] !== '\r') chars[index] = ' ';
      index += 1;
    }
    if (!closed) {
      return { ok: false, error: { message: 'Unterminated comment.', offset: start } };
    }
  }
  return { ok: true, text: chars.join('') };
}

function syntaxError(source: string, offset: number, message: string): CssDeclarationsResult {
  return { ok: false, error: { message, offset: Math.min(offset, source.length) } };
}
