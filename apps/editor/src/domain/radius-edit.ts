import { readTokenTree, refsInText, TOKEN_SEGMENT, type TokenDefinition } from '@facadeur/core';

export function radiusTokenRef(path: string): string {
  return `{${path}}`;
}

export function isValidRadiusTokenPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('.');
  if (parts.length < 2) return false;
  for (const part of parts) {
    if (!part || !TOKEN_SEGMENT.test(part)) return false;
  }
  return trimmed.startsWith('radius.');
}

export function assertRadiusTokenPath(path: string): void {
  const trimmed = path.trim();
  if (!isValidRadiusTokenPath(trimmed)) {
    throw new Error(
      'Radius path must start with "radius." and use only lowercase letters and digits in each segment',
    );
  }
}

export function suggestRadiusPath(existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has('radius.custom')) return 'radius.custom';
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `radius.custom${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not find an unused radius path');
}

export function createDefaultRadiusToken(): TokenDefinition {
  return { $type: 'dimension', $value: '8px' };
}

export function tokenPathsReferencingRadius(tree: unknown, radiusPath: string): string[] {
  const ref = radiusTokenRef(radiusPath);
  const indexed = readTokenTree(tree);
  const paths: string[] = [];
  for (const token of indexed.tokens.values()) {
    if (valueReferencesRadiusPath(token.value, radiusPath, ref)) paths.push(token.path);
    for (const override of Object.values(token.breakpoints)) {
      if (valueReferencesRadiusPath(override, radiusPath, ref)) {
        if (!paths.includes(token.path)) paths.push(token.path);
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function valueReferencesRadiusPath(value: unknown, radiusPath: string, ref: string): boolean {
  if (typeof value === 'string') {
    if (value === ref) return true;
    return refsInText(value).includes(radiusPath);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueReferencesRadiusPath(item, radiusPath, ref));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => valueReferencesRadiusPath(item, radiusPath, ref));
  }
  return false;
}
