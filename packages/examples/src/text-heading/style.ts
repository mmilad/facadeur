import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-eb189c95716c': {
    width: '100%',
    height: 'auto',
    color: '{color.text.primary}',
    font: '{type.title}',
    margin: '{space.0}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
