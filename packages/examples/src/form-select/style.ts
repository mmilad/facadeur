import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-4836151d3102': {
    width: 'auto',
    height: 'auto',
    color: '{color.textmuted}',
    font: '{type.caption}',
    fontWeight: '600',
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-53a58fd11298': {
    width: 'auto',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-fc3f9316496d': {
    width: '16px',
    height: '16px',
    flex: '0 0 16px',
    marginInlineStart: '{layout.gap}',
    opacity: '0.72',
  },
  '550e8400-e29b-41d4-a716-96cc520f2893': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 'auto',
    background: '{color.surface}',
    border: '1px solid {color.border}',
    borderRadius: '{shape.radius}',
    color: '{color.text}',
    font: '{type.body}',
    paddingBlock: '{input.padding.y}',
    paddingInline: '{padding.x}',
  },
  '550e8400-e29b-41d4-a716-77565a320196': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    width: '100%',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
