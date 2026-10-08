import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-9f29eeedf9d5': {
    width: '100%',
    height: 'auto',
    'aspect-ratio': '16 / 9',
    display: 'block',
    objectFit: 'cover',
    maxWidth: '100%',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
