import { readTokenTree, refsInText, TOKEN_SEGMENT, type TokenDefinition } from '@facadeur/core';

export function typographyTokenRef(path: string): string {
  return `{${path}}`;
}

export function isValidTypographyTokenPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('.');
  if (parts.length < 2) return false;
  for (const part of parts) {
    if (!part || !TOKEN_SEGMENT.test(part)) return false;
  }
  return trimmed.startsWith('type.');
}

export function assertTypographyTokenPath(path: string): void {
  const trimmed = path.trim();
  if (!isValidTypographyTokenPath(trimmed)) {
    throw new Error(
      'Typography path must start with "type." and use only lowercase letters and digits in each segment',
    );
  }
}

export function suggestTypographyPath(existing: readonly string[]): string {
  const taken = new Set(existing);
  if (!taken.has('type.custom')) return 'type.custom';
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `type.custom${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Could not find an unused typography path');
}

/** Default composite matches semantic `type.body` at the mobile step in the project template. */
export function createDefaultTypographyToken(): TokenDefinition {
  return {
    $type: 'typography',
    $value: {
      fontFamily: '{font.sans}',
      fontSize: '16px',
      fontWeight: '{font.weight.regular}',
      letterSpacing: '0',
      lineHeight: 1.5,
    },
  };
}

export function tokenPathsReferencingTypography(tree: unknown, typographyPath: string): string[] {
  const ref = typographyTokenRef(typographyPath);
  const indexed = readTokenTree(tree);
  const paths: string[] = [];
  for (const token of indexed.tokens.values()) {
    if (valueReferencesTypographyPath(token.value, typographyPath, ref)) paths.push(token.path);
    for (const override of Object.values(token.breakpoints)) {
      if (valueReferencesTypographyPath(override, typographyPath, ref)) {
        if (!paths.includes(token.path)) paths.push(token.path);
      }
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function valueReferencesTypographyPath(
  value: unknown,
  typographyPath: string,
  ref: string,
): boolean {
  if (typeof value === 'string') {
    if (value === ref) return true;
    return refsInText(value).includes(typographyPath);
  }
  if (Array.isArray(value)) {
    return value.some((item) => valueReferencesTypographyPath(item, typographyPath, ref));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((item) =>
      valueReferencesTypographyPath(item, typographyPath, ref),
    );
  }
  return false;
}
