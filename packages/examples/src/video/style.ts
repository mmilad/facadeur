import type { Node } from '@facadeur/domain';
import { ids as exampleVideoIds } from './idList';

export const styles = {
  [exampleVideoIds.nodes.root]: {
    width: '100%',
    height: 'auto',
    display: 'block',
    objectFit: 'cover',
    maxWidth: '100%',
    aspectRatio: '16 / 9',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
