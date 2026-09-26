import { readTokenTree, refsInText, TOKEN_SEGMENT, type TokenDefinition } from '@facadeur/core';

export function spacingTokenRef(path: string): string {
  return `{${path}}`;
}

export function isValidSpacingTokenPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('.');
  if (parts.length < 2) return false;
  for (const part of parts) {
    if (!part || !TOKEN_SEGMENT.test(part)) return false;
  }
  return trimmed.startsWith('space.');
}

export function assertSpacingTokenPath(path: string): void {
  const trimmed = path.trim();
  if (!isValidSpacingTokenPath(trimmed)) {
    throw new Error(
      'Spacing path must start with "space." and use only lowercase letters and digits in each segment',
    );
  }
}

export function suggestSpacingPath(existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has('space.custom')) return 'space.custom';
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `space.custom${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not find an unused spacing path');
}

export function createDefaultSpacingToken(): TokenDefinition {
  return { $type: 'dimension', $value: '0' };
}

export function tokenPathsReferencingSpacing(tree: unknown, spacingPath: string): string[] {
  const ref = spacingTokenRef(spacingPath);
  const indexed = readTokenTree(tree);
  const paths: string[] = [];
  for (const token of indexed.tokens.values()) {
    if (valueReferencesSpacingPath(token.value, spacingPath, ref)) paths.push(token.path);
    for (const override of Object.values(token.breakpoints)) {
      if (valueReferencesSpacingPath(override, spacingPath, ref)) {
        if (!paths.includes(token.path)) paths.push(token.path);
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function valueReferencesSpacingPath(value: unknown, spacingPath: string, ref: string): boolean {
  if (typeof value === 'string') {
    if (value === ref) return true;
    return refsInText(value).includes(spacingPath);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueReferencesSpacingPath(item, spacingPath, ref));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => valueReferencesSpacingPath(item, spacingPath, ref));
  }
  return false;
}
