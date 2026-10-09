import { type DesignTokenFamily, type DesignTokenValue } from '@facadeur/core';
import { naturalTokenCompare } from './token-table-data';

export {
  commitRawToken,
  commitToken,
  resetTokenBreakpoint,
} from '../../../domain/edits/token-edit';

export interface TableToken {
  uuid: string;
  family: DesignTokenFamily;
  group: string;
  path: string;
  label: string;
  type: string;
  value: DesignTokenValue;
  effectiveValue: DesignTokenValue;
  baseValue: DesignTokenValue;
  override: DesignTokenValue | undefined;
  breakpoints: Record<string, DesignTokenValue>;
  inherited: boolean;
}

export function groupTokens(
  tokens: readonly TableToken[],
): { path: string; tokens: TableToken[] }[] {
  const groups = new Map<string, TableToken[]>();
  for (const token of tokens) {
    const path = token.group ? `${token.family}.${token.group}` : token.family;
    const group = groups.get(path);
    if (group) group.push(token);
    else groups.set(path, [token]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => naturalTokenCompare(left, right))
    .map(([path, grouped]) => ({ path, tokens: grouped }));
}

export function effectiveBreakpointValue(
  base: DesignTokenValue,
  overrides: Readonly<Record<string, DesignTokenValue>>,
  targetUuid: string,
  breakpoints: readonly { uuid: string; minWidth: number }[],
  beforeTarget = false,
  type?: string,
): DesignTokenValue {
  const target = breakpoints.find((breakpoint) => breakpoint.uuid === targetUuid);
  if (!target) return base;
  let effective = base;
  for (const breakpoint of breakpoints) {
    if (
      breakpoint.minWidth > target.minWidth ||
      (beforeTarget && breakpoint.minWidth >= target.minWidth)
    )
      break;
    const override = overrides[breakpoint.uuid];
    if (override !== undefined)
      effective = type === 'typography' ? mergeBreakpointValue(effective, override) : override;
  }
  return effective;
}

function mergeBreakpointValue(
  base: DesignTokenValue,
  override: DesignTokenValue | undefined,
): DesignTokenValue {
  if (override === undefined) return base;
  if (isRecord(base) && isRecord(override)) return { ...base, ...override };
  return override;
}

function isRecord(value: unknown): value is Readonly<Record<string, DesignTokenValue>> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
