import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-2620dd1e25d5': {
    display: 'flex',
    alignItems: 'center',
    gap: '{space.2}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
