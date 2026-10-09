import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormTextInputIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormTextInputIds.nodes.span1]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.caption),
    fontWeight: '600',
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleFormTextInputIds.nodes.img1]: {
    width: '16px',
    height: '16px',
    flex: '0 0 16px',
    marginInlineEnd: '{layout.gap}',
    opacity: '0.72',
  },
  [exampleFormTextInputIds.nodes.div1]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 'auto',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: '{shape.radius}',
    paddingBlock: '{input.padding.y}',
    paddingInline: '{input.padding.x}',
  },
  [exampleFormTextInputIds.nodes.span2]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.caption),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleFormTextInputIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    width: '100%',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.body),
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
