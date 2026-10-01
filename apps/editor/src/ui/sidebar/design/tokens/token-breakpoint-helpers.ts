import { refsInText, type JsonValue } from '@facadeur/core';
import type { EditorSession, EditorSnapshot } from '../../../../domain/session.js';
import {
  parseEditedValue,
  withTokenBreakpoint,
  withTokenValue,
} from '../../../../domain/edits/token-edit.js';
import { naturalTokenCompare } from './TokenTable.js';

export interface TableToken {
  path: string;
  type: string;
  value: JsonValue;
  effectiveValue: JsonValue;
  baseValue: JsonValue;
  override: JsonValue | undefined;
  breakpoints: Record<string, JsonValue>;
  inherited: boolean;
  deprecated: boolean | string | undefined;
}

export function groupTokens(
  tokens: readonly TableToken[],
): { path: string; tokens: TableToken[] }[] {
  const groups = new Map<string, TableToken[]>();
  for (const token of tokens) {
    const parts = token.path.split('.');
    const path = parts.length > 1 ? parts.slice(0, -1).join('.') : '(root)';
    const group = groups.get(path);
    if (group) group.push(token);
    else groups.set(path, [token]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => naturalTokenCompare(left, right))
    .map(([path, grouped]) => ({ path, tokens: grouped }));
}

export function effectiveBreakpointValue(
  base: JsonValue,
  overrides: Record<string, JsonValue>,
  targetId: string,
  breakpoints: readonly { id: string; minWidth: number }[],
  beforeTarget = false,
  type?: string,
): JsonValue {
  const target = breakpoints.find((breakpoint) => breakpoint.id === targetId);
  if (!target) return base;
  let effective = base;
  for (const breakpoint of breakpoints) {
    if (
      breakpoint.minWidth > target.minWidth ||
      (beforeTarget && breakpoint.minWidth >= target.minWidth)
    )
      break;
    const override = overrides[breakpoint.id];
    if (override !== undefined)
      effective = type === 'typography' ? mergeBreakpointValue(effective, override) : override;
  }
  return effective;
}

function mergeBreakpointValue(base: JsonValue, override: JsonValue | undefined): JsonValue {
  if (override === undefined) return base;
  if (isRecord(base) && isRecord(override)) {
    return { ...base, ...override } as JsonValue;
  }
  return override;
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function commitToken(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  previous: JsonValue,
  text: string,
  breakpointId: string | null,
) {
  try {
    const value = parseEditedValue(text, previous);
    if (containsTokenReference(value, path))
      throw new Error(`Token "${path}" cannot reference itself`);
    const token = breakpointId
      ? withTokenBreakpoint(snap.design.tokens, path, breakpointId, value)
      : withTokenValue(snap.design.tokens, path, value);
    session.executeDesign({ type: 'setToken', path, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

export function commitRawToken(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  next: unknown,
  breakpointId: string | null,
) {
  if (next === null || next === undefined) {
    if (breakpointId) resetTokenBreakpoint(session, snap, path, breakpointId);
    return;
  }
  try {
    const value = JSON.parse(JSON.stringify(next)) as JsonValue;
    if (containsTokenReference(value, path))
      throw new Error(`Token "${path}" cannot reference itself`);
    const token = breakpointId
      ? withTokenBreakpoint(snap.design.tokens, path, breakpointId, value)
      : withTokenValue(snap.design.tokens, path, value);
    session.executeDesign({ type: 'setToken', path, token });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}

function containsTokenReference(value: unknown, path: string): boolean {
  if (typeof value === 'string') return refsInText(value).includes(path);
  if (Array.isArray(value)) return value.some((item) => containsTokenReference(item, path));
  if (value && typeof value === 'object')
    return Object.values(value).some((item) => containsTokenReference(item, path));
  return false;
}

export function resetTokenBreakpoint(
  session: EditorSession,
  snap: EditorSnapshot,
  path: string,
  breakpointId: string,
) {
  if (!breakpointId) return;
  try {
    session.executeDesign({
      type: 'setToken',
      path,
      token: withTokenBreakpoint(snap.design.tokens, path, breakpointId, null),
    });
  } catch (error) {
    session.setNotice(error instanceof Error ? error.message : 'Invalid token', 'error');
  }
}
