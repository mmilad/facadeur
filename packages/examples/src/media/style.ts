import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-f4a255f00959': {
    'aspect-ratio': '16 / 9',
  },
  '550e8400-e29b-41d4-a716-77bc276ee15b': {
    'aspect-ratio': '16 / 9',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
