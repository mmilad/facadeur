import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormSegmentedIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormSegmentedIds.nodes.span1]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.caption),
    fontWeight: '600',
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleFormSegmentedIds.nodes.span2]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
  },
  [exampleFormSegmentedIds.nodes.span3]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
  },
  [exampleFormSegmentedIds.nodes.span4]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
  },
  [exampleFormSegmentedIds.nodes.div1]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenRef(exampleTokenIds.space.scale.step0),
    width: 'auto',
    height: 'auto',
    background: tokenRef(exampleTokenIds.color.bg.muted),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: '{shape.radius}',
    font: tokenRef(exampleTokenIds.type.caption),
    paddingBlock: '{padding.y}',
    paddingInline: '{padding.x}',
  },
  [exampleFormSegmentedIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    width: '100%',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
