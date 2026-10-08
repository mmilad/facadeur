import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-dc83518369e3': {
    width: '100%',
    height: 'auto',
    appearance: 'none',
    background: '{color.surfa}',
    border: '1px solid {color.border}',
    borderRadius: '{shape.radius}',
    boxSizing: 'border-box',
    color: '{color.text}',
    font: '{type.body}',
    paddingBlock: '{input.padding.y}',
    paddingInline: '{input.padding.x}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
