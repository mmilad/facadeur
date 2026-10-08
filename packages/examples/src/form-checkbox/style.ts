import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-60b63699ece2': {
    accentColor: '{color.accent.default}',
    width: '16px',
    height: '16px',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
