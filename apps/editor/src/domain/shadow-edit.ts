import { readTokenTree, refsInText, TOKEN_SEGMENT, type TokenDefinition } from '@facadeur/core';

export function shadowTokenRef(path: string): string {
  return `{${path}}`;
}

export function isValidShadowTokenPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('.');
  if (parts.length < 2) return false;
  for (const part of parts) {
    if (!part || !TOKEN_SEGMENT.test(part)) return false;
  }
  return trimmed.startsWith('shadow.');
}

export function assertShadowTokenPath(path: string): void {
  const trimmed = path.trim();
  if (!isValidShadowTokenPath(trimmed)) {
    throw new Error(
      'Shadow path must start with "shadow." and use only lowercase letters and digits in each segment',
    );
  }
}

export function suggestShadowPath(existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has('shadow.custom')) return 'shadow.custom';
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `shadow.custom${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not find an unused shadow path');
}

/** Default composite matches primitive `shadow.sm` in the project template. */
export function createDefaultShadowToken(): TokenDefinition {
  return {
    $type: 'shadow',
    $value: {
      offsetX: '0px',
      offsetY: '1px',
      blur: '2px',
      spread: '0px',
      color: '#0f172a14',
    },
  };
}

export function tokenPathsReferencingShadow(tree: unknown, shadowPath: string): string[] {
  const ref = shadowTokenRef(shadowPath);
  const indexed = readTokenTree(tree);
  const paths: string[] = [];
  for (const token of indexed.tokens.values()) {
    if (valueReferencesShadowPath(token.value, shadowPath, ref)) paths.push(token.path);
    for (const override of Object.values(token.breakpoints)) {
      if (valueReferencesShadowPath(override, shadowPath, ref)) {
        if (!paths.includes(token.path)) paths.push(token.path);
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function valueReferencesShadowPath(value: unknown, shadowPath: string, ref: string): boolean {
  if (typeof value === 'string') {
    if (value === ref) return true;
    return refsInText(value).includes(shadowPath);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueReferencesShadowPath(item, shadowPath, ref));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => valueReferencesShadowPath(item, shadowPath, ref));
  }
  return false;
}
