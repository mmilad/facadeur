import {
  componentTokenPublicPath,
  globalRefInComponentTokenDefault,
  readTokenTree,
  type ComponentToken,
  type FlatDocument,
  type TokenType,
} from '@facadeur/core';

export type { ComponentToken };

export function readComponentTokens(
  doc: FlatDocument,
): Record<string, ComponentToken> | undefined {
  return (doc as FlatDocument & { componentTokens?: Record<string, ComponentToken> })
    .componentTokens;
}

const COMPONENT_TOKEN_PATH = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)+$/;

export function isValidComponentTokenPath(path: string): boolean {
  return COMPONENT_TOKEN_PATH.test(path.trim());
}

export function assertComponentTokenPath(path: string): void {
  const trimmed = path.trim();
  if (!isValidComponentTokenPath(trimmed)) {
    throw new Error(
      'Token path must use lowercase letters and digits in each segment, separated by dots',
    );
  }
}

export function assertComponentTokenPathAvailable(
  path: string,
  globalPaths: ReadonlySet<string>,
  localPaths: ReadonlySet<string>,
): void {
  assertComponentTokenPath(path);
  if (globalPaths.has(path)) {
    throw new Error(`"${path}" is already a global design token`);
  }
  if (localPaths.has(path)) {
    throw new Error(`Local token "${path}" already exists`);
  }
}

export function globalTokenPaths(designTokens: unknown): ReadonlySet<string> {
  return new Set(readTokenTree(designTokens).tokens.keys());
}

/** Documents whose styles or local defaults still use a global token. */
export function documentsReferencingToken(
  documents: readonly {
    id: string;
    tokenInterface?: { reads?: string[] };
    componentTokens?: Record<string, { value: string }>;
  }[],
  tokenPath: string,
): string[] {
  const hits: string[] = [];
  for (const doc of documents) {
    const locals = Object.entries(doc.componentTokens ?? {})
      .filter(([, token]) => globalRefInComponentTokenDefault(token.value) === tokenPath)
      .map(([localPath]) => componentTokenPublicPath(doc.id, localPath));
    if (locals.length) {
      hits.push(...locals);
      continue;
    }
    if (doc.tokenInterface?.reads?.includes(tokenPath)) hits.push(doc.id);
  }
  return hits.sort((left, right) => left.localeCompare(right));
}

export function suggestComponentTokenPath(
  prefix: string,
  existing: ReadonlySet<string>,
): string {
  const base = prefix.trim() || 'color.custom';
  if (!existing.has(base)) return base;
  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${base}${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error('Could not find an unused token path');
}

export function defaultComponentToken(type: TokenType): ComponentToken {
  switch (type) {
    case 'color':
      return { type, value: '#000000' };
    case 'dimension':
      return { type, value: '8px' };
    case 'number':
      return { type, value: '1' };
    case 'fontFamily':
      return { type, value: 'system-ui, sans-serif' };
    case 'fontWeight':
      return { type, value: '400' };
    case 'shadow':
      return { type, value: '0 1px 2px #00000014' };
    case 'typography':
      return {
        type,
        value: JSON.stringify({
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          fontWeight: '400',
          lineHeight: '1.4',
        }),
      };
    default:
      return { type, value: '' };
  }
}
