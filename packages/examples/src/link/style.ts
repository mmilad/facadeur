import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleLinkIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleLinkIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.accent.default),
    font: tokenRef(exampleTokenIds.type.label),
    textDecoration: 'underline',
    textUnderlineOffset: '0.15em',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
