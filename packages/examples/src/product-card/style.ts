import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-c0a5800714f9': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    height: 'auto',
    maxWidth: '360px',
    background: '{color.bg.canvas}',
    border: '1px solid {color.border.default}',
    borderRadius: '{radius.lg}',
    boxShadow: '{shadow.md}',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  '550e8400-e29b-41d4-a716-2be787034eaa': {
    width: '100%',
    height: '240px',
    display: 'block',
    objectFit: 'cover',
  },
  '550e8400-e29b-41d4-a716-323107734940': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{space.gap.md}',
    padding: '{space.inset.lg}',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-d4bf52b891cb': {
    color: '{color.text.primary}',
    font: '{type.title}',
    margin: '{space.0}',
    overflowWrap: 'anywhere',
  },
  '550e8400-e29b-41d4-a716-ba278b0f8976': {
    color: '{color.text.secondary}',
    font: '{type.body}',
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-2226d2a09f81': {
    width: '100%',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
