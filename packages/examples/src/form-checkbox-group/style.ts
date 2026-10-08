import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-46b80f2bcb22': {
    display: 'flex',
    flexDirection: 'column',
    gap: '{space.2}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
