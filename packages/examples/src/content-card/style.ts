import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-711653adba3d': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    height: 'auto',
    maxWidth: '360px',
    background: '{color.bg}',
    border: '1px solid {color.border}',
    borderRadius: '{shape.radius}',
    boxShadow: '{elevation.shadow}',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  '550e8400-e29b-41d4-a716-7d669086c137': {
    width: '100%',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-9b6904fdf010': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    padding: '{layout.padding}',
    width: '100%',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-b1d317d292af': {
    width: '100%',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-8bea6ada581a': {
    width: '100%',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
