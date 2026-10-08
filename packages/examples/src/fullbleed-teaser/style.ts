import type { Node } from '@facadeur/domain';

export const styles = {
  '550e8400-e29b-41d4-a716-00000000006b': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    height: 'auto',
    background: '{color.bg}',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  '550e8400-e29b-41d4-a716-b5ddc99a5c38': {
    width: '100%',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-1cc03f1f8f62': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    padding: '{layout.padding}',
    width: '100%',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-8b704bf6eabf': {
    width: '100%',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-abdaf56d3194': {
    width: '100%',
    height: 'auto',
  },
  '550e8400-e29b-41d4-a716-03b8b9a838a4': {
    width: 'auto',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
