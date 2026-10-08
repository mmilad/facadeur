import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-51f62f6edaa7': {
    width: '100%',
    height: 'auto',
    color: '{color.text.secondary}',
    font: '{type.body}',
    margin: '{space.0}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
