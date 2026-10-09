import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleTextBodyIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleTextBodyIds.nodes.root]: {
    width: '100%',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.body),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
