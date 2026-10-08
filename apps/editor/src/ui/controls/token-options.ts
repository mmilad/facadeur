import type { SelectOption } from '../form/types/options';
import { tokenPath, tokenDisplayLabel, tokenTitle } from './token-presentation';
import {
  useTokenLabel,
  useTokenResolver,
  useTokenSearchValue,
} from './fields/TokenPreviewContext';

function tokenGroup(path: string): string | undefined {
  const segments = path.split('.');
  return segments.length > 2 ? tokenTitle(segments.slice(0, -1).join('.')) : undefined;
}

/** All token comboboxes use the same live labels and resolved-value search as the picker. */
export function useTokenOptions() {
  const labelFor = useTokenLabel();
  const resolve = useTokenResolver();
  const searchValue = useTokenSearchValue();
  return (tokens: readonly string[], current?: string, emptyLabel = 'None'): SelectOption[] =>
    catalogTokenOptions(tokens, current, emptyLabel, labelFor).map((option) => ({
      ...option,
      keywords: `${option.keywords ?? ''} ${searchValue(option.value) ?? ''} ${resolve(option.value) ?? ''}`,
    }));
}

/** Build select options from token refs with readable path labels and optional grouping. */
export function catalogTokenOptions(
  tokens: readonly string[],
  current?: string,
  emptyLabel = 'None',
  resolveLabel: (ref: string) => string = tokenDisplayLabel,
): SelectOption[] {
  const list = current && !tokens.includes(current) ? [current, ...tokens] : [...tokens];
  const options = list.map((ref) => {
    const path = tokenPath(ref);
    return {
      value: ref,
      label: resolveLabel(ref),
      description: path,
      keywords: `${path} ${tokenTitle(path)}`,
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
  resolveLabel?: (ref: string) => string,
): SelectOption[] {
  return catalogTokenOptions(tokens, current, emptyLabel, resolveLabel);
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
