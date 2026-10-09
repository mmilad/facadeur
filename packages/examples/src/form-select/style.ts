import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormSelectIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormSelectIds.nodes.span1]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.caption),
    fontWeight: '600',
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleFormSelectIds.nodes.span2]: {
    width: 'auto',
    height: 'auto',
  },
  [exampleFormSelectIds.nodes.img1]: {
    width: '16px',
    height: '16px',
    flex: '0 0 16px',
    marginInlineStart: '{layout.gap}',
    opacity: '0.72',
  },
  [exampleFormSelectIds.nodes.div1]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 'auto',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: '{shape.radius}',
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.body),
    paddingBlock: '{input.padding.y}',
    paddingInline: '{padding.x}',
  },
  [exampleFormSelectIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    width: '100%',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
