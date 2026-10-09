import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleTextHeadingIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleTextHeadingIds.nodes.root]: {
    width: '100%',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.title),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
