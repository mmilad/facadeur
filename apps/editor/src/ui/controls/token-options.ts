import type { SelectOption } from '../form/types/options.js';

function tokenPath(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed.slice(1, -1);
  return trimmed;
}

function tokenGroup(path: string): string | undefined {
  const segment = path.split('.')[0];
  return segment && segment !== path ? segment : undefined;
}

/** Build select options from token refs with readable path labels and optional grouping. */
export function catalogTokenOptions(
  tokens: readonly string[],
  current?: string,
  emptyLabel = 'None',
): SelectOption[] {
  const list = current && !tokens.includes(current) ? [current, ...tokens] : [...tokens];
  const options = list.map((ref) => {
    const path = tokenPath(ref);
    return {
      value: ref,
      label: path,
      group: tokenGroup(path),
    };
  });
  return [{ value: '', label: emptyLabel }, ...options];
}

/** Dimension token refs as combobox/select options, preserving an ad-hoc current value. */
export function dimensionTokenOptions(
  tokens: readonly string[],
  current?: string,
  emptyLabel = 'None',
): SelectOption[] {
  return catalogTokenOptions(tokens, current, emptyLabel);
}

export function colorTokenOptions(
  tokens: readonly string[],
  current?: string,
  emptyLabel = 'None',
): SelectOption[] {
  return catalogTokenOptions(tokens, current, emptyLabel);
}

export function shadowTokenOptions(
  tokens: readonly string[],
  current?: string,
  emptyLabel = 'None',
): SelectOption[] {
  return catalogTokenOptions(tokens, current, emptyLabel);
}
