import {
  readTokenTree,
  refsInText,
  type DesignTokenFamily,
  type DesignTokenValue,
  type JsonValue,
  type TokenDefinition,
  type TokenTree,
} from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../session';

export function formatTokenValue(value: JsonValue | DesignTokenValue): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? '';
}

/** Keep strings as strings. Objects and numbers are parsed so a color edit stays a color. */
export function parseEditedValue(text: string, previous: JsonValue | DesignTokenValue): JsonValue {
  if (typeof previous === 'string') return text.trim();
  if (typeof previous === 'number') {
    const value = Number(text.trim());
    if (!Number.isFinite(value)) throw new Error('Value must be a number');
    return value;
  }
  if (typeof previous === 'boolean') {
    if (text.trim() === 'true') return true;
    if (text.trim() === 'false') return false;
    throw new Error('Value must be true or false');
  }
  return JSON.parse(text) as JsonValue;
}

export function withTokenValue(
  tree: TokenTree,
  family: DesignTokenFamily,
  uuid: string,
  value: JsonValue,
): TokenDefinition {
  const token = tokenRecord(tree, family, uuid);
  return { ...token, value };
}

export function withTokenLabel(
  tree: TokenTree,
  family: DesignTokenFamily,
  uuid: string,
  label: string,
): TokenDefinition {
  const token = tokenRecord(tree, family, uuid);
  return { ...token, label: label.trim() };
}

export function withTokenGroup(
  tree: TokenTree,
  family: DesignTokenFamily,
  uuid: string,
  group: string,
): TokenDefinition {
  const token = tokenRecord(tree, family, uuid);
  return { ...token, group: group.trim() };
}

export function withTokenMetadata(
  tree: TokenTree,
  family: DesignTokenFamily,
  uuid: string,
  metadata: { label: string; group: string },
): TokenDefinition {
  const token = tokenRecord(tree, family, uuid);
  return { ...token, label: metadata.label.trim(), group: metadata.group.trim() };
}

/** `null` removes one responsive value; other breakpoints and the base value stay intact. */
export function withTokenBreakpoint(
  tree: TokenTree,
  family: DesignTokenFamily,
  uuid: string,
  breakpointUuid: string,
  value: JsonValue | null,
): TokenDefinition {
  const token = tokenRecord(tree, family, uuid);
  const breakpoints = { ...(token.breakpoints ?? {}) };
  if (value === null) delete breakpoints[breakpointUuid];
  else breakpoints[breakpointUuid] = value;
  return {
    ...token,
    ...(Object.keys(breakpoints).length ? { breakpoints } : { breakpoints: undefined }),
  };
}

export function commitToken(
  session: EditorSession,
  snap: EditorSnapshot,
  family: DesignTokenFamily,
  uuid: string,
  previous: JsonValue | DesignTokenValue,
  text: string,
  breakpointUuid: string | null,
) {
  try {
    const value = parseEditedValue(text, previous);
    if (containsTokenReference(value, uuid)) throw new Error('A token cannot reference itself');
    const token = breakpointUuid
      ? withTokenBreakpoint(snap.design.tokens, family, uuid, breakpointUuid, value)
      : withTokenValue(snap.design.tokens, family, uuid, value);
    session.executeDesign({ type: 'setToken', family, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

export function commitRawToken(
  session: EditorSession,
  snap: EditorSnapshot,
  family: DesignTokenFamily,
  uuid: string,
  next: unknown,
  breakpointUuid: string | null,
) {
  if (next === null || next === undefined) {
    if (breakpointUuid) resetTokenBreakpoint(session, snap, family, uuid, breakpointUuid);
    return;
  }
  try {
    const value = JSON.parse(JSON.stringify(next)) as JsonValue;
    if (containsTokenReference(value, uuid)) throw new Error('A token cannot reference itself');
    const token = breakpointUuid
      ? withTokenBreakpoint(snap.design.tokens, family, uuid, breakpointUuid, value)
      : withTokenValue(snap.design.tokens, family, uuid, value);
    session.executeDesign({ type: 'setToken', family, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function containsTokenReference(value: unknown, uuid: string): boolean {
  if (typeof value === 'string') return refsInText(value).includes(uuid);
  if (Array.isArray(value)) return value.some((item) => containsTokenReference(item, uuid));
  if (value && typeof value === 'object')
    return Object.values(value).some((item) => containsTokenReference(item, uuid));
  return false;
}

export function resetTokenBreakpoint(
  session: EditorSession,
  snap: EditorSnapshot,
  family: DesignTokenFamily,
  uuid: string,
  breakpointUuid: string,
) {
  if (!breakpointUuid) return;
  try {
    session.executeDesign({
      type: 'setToken',
      family,
      token: withTokenBreakpoint(snap.design.tokens, family, uuid, breakpointUuid, null),
    });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

export function tokensReferencingUuid(tree: unknown, uuid: string): string[] {
  const paths: string[] = [];
  for (const token of readTokenTree(tree).tokens.values()) {
    if (
      containsTokenReference(token.value, uuid) ||
      Object.values(token.breakpoints).some((value) => containsTokenReference(value, uuid))
    ) {
      paths.push(token.path);
    }
  }
  return paths.sort((left, right) => left.localeCompare(right));
}

function tokenRecord(tree: TokenTree, family: DesignTokenFamily, uuid: string): TokenDefinition {
  const token = readTokenTree(tree).tokens.get(uuid);
  if (!token || token.family !== family) throw new Error(`Missing ${family} token ${uuid}`);
  return tree[family][uuid] ?? token;
}
