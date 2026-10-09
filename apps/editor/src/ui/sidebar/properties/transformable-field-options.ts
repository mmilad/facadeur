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
    const group = tokenGroup(token);
    if (!group) continue;
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

function tokenGroup(token: AutocompleteOption) {
  const root = token.description?.trim().split('.')[0];
  if (!root) return undefined;
  return `${root[0]!.toUpperCase()}${root.slice(1)} tokens`;
}
