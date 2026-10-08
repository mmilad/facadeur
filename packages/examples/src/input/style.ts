import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-2222780064fe': {
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-e7e9046fa872': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{space.gap.xs}',
    width: '100%',
    height: 'auto',
    color: '{color.text.secondary}',
    font: '{type.label}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
