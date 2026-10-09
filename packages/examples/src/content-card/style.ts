import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleContentCardIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleContentCardIds.nodes.div1]: {
    width: '100%',
    height: 'auto',
  },
  [exampleContentCardIds.nodes.div3]: {
    width: '100%',
    height: 'auto',
  },
  [exampleContentCardIds.nodes.div4]: {
    width: '100%',
    height: 'auto',
  },
  [exampleContentCardIds.nodes.div2]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    padding: '{layout.padding}',
    width: '100%',
    height: 'auto',
  },
  [exampleContentCardIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    height: 'auto',
    maxWidth: '360px',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: '{shape.radius}',
    boxShadow: '{elevation.shadow}',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
