import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-000000000065': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '{layout.gap}',
    width: 'auto',
    height: 'auto',
    appearance: 'none',
    background: '{color.bg}',
    border: '1px solid transparent',
    borderRadius: '{radius.full}',
    color: '{color.text}',
    cursor: 'pointer',
    font: '{type.label}',
    letterSpacing: '0.01em',
    lineHeight: '1',
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
    whiteSpace: 'nowrap',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
