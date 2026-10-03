import type { RuleInput, RuleChild } from './types';

export function splitRuleInput(input: RuleInput): {
  declarations: Record<string, string | number>;
  children: RuleChild[];
} {
  const declarations: Record<string, string | number> = {};
  const children = input.children ?? [];
  for (const [key, value] of Object.entries(input)) {
    if (key === 'children' || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number') declarations[key] = value;
  }
  return { declarations, children };
}
