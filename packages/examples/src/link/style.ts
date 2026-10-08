import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-6427970761c0': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: 'auto',
    height: 'auto',
    color: '{color.accent.default}',
    font: '{type.label}',
    textDecoration: 'underline',
    textUnderlineOffset: '0.15em',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
