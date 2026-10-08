import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-97d18fb0ecd1': {
    width: '150px',
    height: 'auto',
    color: '{color.text}',
    fontWeight: '600',
  },
  '550e8400-e29b-41d4-a716-2bbcdf8f1792': {
    width: '100px',
    height: 'auto',
    color: '{color.textmuted}',
    font: '{type.caption}',
  },
  '550e8400-e29b-41d4-a716-9f1924e8cee9': {
    width: '100%',
    height: 'auto',
    color: '{color.textmuted}',
    font: '{type.caption}',
  },
  '550e8400-e29b-41d4-a716-4c7812fe9f47': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '{space.3}',
    width: '100%',
    height: 'auto',
    background: '{color.surface}',
    borderBottom: '1px solid {color.bordersubtle}',
    font: '{type.body}',
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
