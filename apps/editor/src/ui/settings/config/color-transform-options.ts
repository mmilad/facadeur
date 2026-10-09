import type { AutocompleteOption, TransformableFieldOption } from '@facadeur/form';
import { tokenPath, tokenTitle } from '../../controls/token-presentation';

export function colorTransformOptions(
  tokens: readonly string[],
  labelFor: (reference: string) => string,
  searchValue: (reference: string) => string | undefined,
  resolve: (reference: string) => string | undefined,
): TransformableFieldOption[] {
  const groups = new Map<string, AutocompleteOption[]>();
  for (const reference of tokens) {
    const path = tokenPath(reference);
    const parts = path.split('.');
    const group = parts.length > 2 ? tokenTitle(parts.slice(0, -1).join('.')) : 'Colors';
    const options = groups.get(group) ?? [];
    options.push({
      value: reference,
      label: labelFor(reference),
      description: resolve(reference) ?? searchValue(reference) ?? path,
      group,
      keywords: `${path} ${tokenTitle(path)}`,
    });
    groups.set(group, options);
  }
  return [
    { type: 'text', label: 'Text' },
    { type: 'color', label: 'Color' },
    ...[...groups].map(([label, items]) => ({
      type: 'token' as const,
      label: `${label} tokens`,
      items,
    })),
  ];
}
