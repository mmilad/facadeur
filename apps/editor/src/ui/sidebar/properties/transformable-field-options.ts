import type { AutocompleteOption, TransformableFieldOption } from '@facadeur/form';

export function transformableFieldOptions({
  props,
  tokens,
  color = false,
}: {
  props: readonly AutocompleteOption[];
  tokens: readonly AutocompleteOption[];
  color?: boolean;
}): TransformableFieldOption[] {
  const tokenGroups = new Map<string, AutocompleteOption[]>();
  for (const token of tokens) {
    const group = tokenGroup(token.label);
    const items = tokenGroups.get(group) ?? [];
    items.push(token);
    tokenGroups.set(group, items);
  }

  return [
    { type: 'text', label: 'Text' },
    ...(props.length ? [{ type: 'prop' as const, label: 'Component props', items: props }] : []),
    ...(tokenGroups.size
      ? [
          {
            type: 'set' as const,
            label: 'Tokens',
            items: [...tokenGroups].map(([label, items]) => ({
              type: 'token' as const,
              label,
              items,
            })),
          },
        ]
      : []),
    ...(color ? [{ type: 'color' as const, label: 'Color' }] : []),
  ];
}

function tokenGroup(label: string) {
  const match = /^--fcdr-([^-]+)/.exec(label);
  return match?.[1] ? `${match[1][0]!.toUpperCase()}${match[1].slice(1)} tokens` : 'Other tokens';
}
