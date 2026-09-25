import type { SelectOption } from '../form/types/options.js';

/** Dimension token refs as combobox/select options, preserving an ad-hoc current value. */
export function dimensionTokenOptions(
  tokens: readonly string[],
  current?: string,
  emptyLabel = 'None',
): SelectOption[] {
  return catalogTokenOptions(tokens, current, emptyLabel);
}

export function catalogTokenOptions(
  tokens: readonly string[],
  current?: string,
  emptyLabel = 'None',
): SelectOption[] {
  const list = current && !tokens.includes(current) ? [current, ...tokens] : [...tokens];
  return [
    { value: '', label: emptyLabel },
    ...list.map((token) => ({ value: token, label: token })),
  ];
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
