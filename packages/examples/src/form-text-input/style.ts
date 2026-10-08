import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-21c869043041': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    width: '100%',
    height: 'auto',
    color: '{color.text}',
    font: '{type.body}',
  },
  '550e8400-e29b-41d4-a716-aeecf87c99ac': {
    width: 'auto',
    height: 'auto',
    color: '{color.textmuted}',
    font: '{type.caption}',
    fontWeight: '600',
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-8ccf0e01bde2': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 'auto',
    background: '{color.surface}',
    border: '1px solid {color.border}',
    borderRadius: '{shape.radius}',
    paddingBlock: '{input.padding.y}',
    paddingInline: '{input.padding.x}',
  },
  '550e8400-e29b-41d4-a716-13b4d4037dd8': {
    width: '16px',
    height: '16px',
    flex: '0 0 16px',
    marginInlineEnd: '{layout.gap}',
    opacity: '0.72',
  },
  '550e8400-e29b-41d4-a716-a8d593ad9fcf': {
    width: 'auto',
    height: 'auto',
    color: '{color.textmuted}',
    font: '{type.caption}',
    margin: '{space.0}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
