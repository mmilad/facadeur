import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-000000000003': {
    width: '100%',
    height: 'auto',
    display: 'block',
    objectFit: 'cover',
    maxWidth: '100%',
    aspectRatio: '16 / 9',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
