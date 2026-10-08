import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-7feb971f5e3c': {
    width: 'auto',
    height: 'auto',
    color: '{color.text}',
    font: '{type.body}',
    margin: '{space.0}',
  },
  '550e8400-e29b-41d4-a716-f6c221efef5c': {
    width: '16px',
    height: '16px',
    background: '{color.text.inverse}',
    borderRadius: '{radius.full}',
    flex: '0 0 16px',
  },
  '550e8400-e29b-41d4-a716-db1815e7ce3e': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '36px',
    height: '20px',
    background: '{color.accent.default}',
    border: '2px solid transparent',
    borderRadius: '{radius.full}',
    justifyContent: 'flex-end',
  },
  '550e8400-e29b-41d4-a716-cf6ce94972e3': {
    width: 'auto',
    height: 'auto',
    color: '{color.textmuted}',
    font: '{type.caption}',
  },
  '550e8400-e29b-41d4-a716-4bbc0bebd5af': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '{space.2}',
    width: 'auto',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-a97359bef840': {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '{space.4}',
    width: '100%',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
