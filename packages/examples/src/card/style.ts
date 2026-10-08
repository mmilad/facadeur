import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-000000000067': {
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
  '550e8400-e29b-41d4-a716-ca420a0f1a23': {
    color: '{color.accent.default}',
    font: '{type.caption}',
    letterSpacing: '0.16em',
    margin: '{space.0}',
    textTransform: 'uppercase',
  },
  '550e8400-e29b-41d4-a716-d842df7ffcf0': {
    color: '{color.text.primary}',
    font: '{type.title}',
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-8dad5919789d': {
    color: '{color.text.secondary}',
    font: '{type.body}',
    margin: '{space.0}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
