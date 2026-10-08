import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-56c34e4f5862': {
    display: 'flex',
    flexDirection: 'column',
    gap: '{space.2}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
