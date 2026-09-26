import { readTokenTree, refsInText, TOKEN_SEGMENT, type TokenDefinition } from '@facadeur/core';

export function colorTokenRef(path: string): string {
  return `{${path}}`;
}

export function isValidColorTokenPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('.');
  if (parts.length < 2) return false;
  for (const part of parts) {
    if (!part || !TOKEN_SEGMENT.test(part)) return false;
  }
  return trimmed.startsWith('color.');
}

export function assertColorTokenPath(path: string): void {
  const trimmed = path.trim();
  if (!isValidColorTokenPath(trimmed)) {
    throw new Error(
      'Color path must start with "color." and use only lowercase letters and digits in each segment',
    );
  }
}

export function suggestColorPath(existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has('color.custom')) return 'color.custom';
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `color.custom${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not find an unused color path');
}

export function createDefaultColorToken(): TokenDefinition {
  return { $type: 'color', $value: '#000000' };
}

export function tokenPathsReferencingColor(tree: unknown, colorPath: string): string[] {
  const ref = colorTokenRef(colorPath);
  const indexed = readTokenTree(tree);
  const paths: string[] = [];
  for (const token of indexed.tokens.values()) {
    if (valueReferencesColorPath(token.value, colorPath, ref)) paths.push(token.path);
    for (const override of Object.values(token.breakpoints)) {
      if (valueReferencesColorPath(override, colorPath, ref)) {
        if (!paths.includes(token.path)) paths.push(token.path);
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function valueReferencesColorPath(value: unknown, colorPath: string, ref: string): boolean {
  if (typeof value === 'string') {
    if (value === ref) return true;
    return refsInText(value).includes(colorPath);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueReferencesColorPath(item, colorPath, ref));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => valueReferencesColorPath(item, colorPath, ref));
  }
  return false;
}
