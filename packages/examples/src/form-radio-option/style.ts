import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormRadioOptionIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormRadioOptionIds.nodes.root]: {
    display: 'flex',
    alignItems: 'center',
    gap: tokenRef(exampleTokenIds.space.scale.step2),
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
