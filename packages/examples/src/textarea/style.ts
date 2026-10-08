import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-8f7fc3f2f8ee': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{space.gap.xs}',
    width: '100%',
    height: 'auto',
    color: '{color.text.secondary}',
    font: '{type.label}',
  },
  '550e8400-e29b-41d4-a716-ade185dfdbf3': {
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-b9e0579593a3': {
    width: '100%',
    height: 'auto',
    appearance: 'none',
    background: '{color.bg.muted}',
    border: '1px solid {color.neutral.400}',
    borderRadius: '{input.radius}',
    boxSizing: 'border-box',
    color: '{color.text}',
    display: 'block',
    font: '{type.body}',
    letterSpacing: '0',
    paddingBlock: '{input.padding.y}',
    paddingInline: '{input.padding.x}',
    resize: 'vertical',
    textTransform: 'none',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
