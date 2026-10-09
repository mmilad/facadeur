import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormFieldRowIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormFieldRowIds.nodes.span1]: {
    width: '150px',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.primary),
    fontWeight: '600',
  },
  [exampleFormFieldRowIds.nodes.span2]: {
    width: '100px',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.caption),
  },
  [exampleFormFieldRowIds.nodes.span3]: {
    width: '100%',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.caption),
  },
  [exampleFormFieldRowIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenRef(exampleTokenIds.space.scale.step3),
    width: '100%',
    height: 'auto',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    borderBottom: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    font: tokenRef(exampleTokenIds.type.body),
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
