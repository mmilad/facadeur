import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-00000000006f': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    padding: '{layout.padding}',
    width: '100%',
    height: 'auto',
    background: '{color.bg}',
    border: '1px solid {color.border}',
    borderRadius: '{shape.radius}',
    boxShadow: '{elevation.shadow}',
  },
  '550e8400-e29b-41d4-a716-4bcf572af571': {
    color: '{color.accent.default}',
    font: '{type.caption}',
    letterSpacing: '0.16em',
    margin: '{space.0}',
    textTransform: 'uppercase',
  },
  '550e8400-e29b-41d4-a716-cb765c804572': {
    color: '{color.text.primary}',
    font: '{type.title}',
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-02b3fdbd0f6a': {
    color: '{color.text.secondary}',
    font: '{type.body}',
    margin: '{space.0}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
