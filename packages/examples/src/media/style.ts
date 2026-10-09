import type { Node } from '@facadeur/domain';
import { ids as exampleMediaIds } from './idList';

export const styles = {
  [exampleMediaIds.nodes.img1]: {
    aspectRatio: '16 / 9',
  },
  [exampleMediaIds.nodes.video1]: {
    aspectRatio: '16 / 9',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
