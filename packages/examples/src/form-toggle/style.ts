import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormToggleIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormToggleIds.nodes.span1]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.body),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleFormToggleIds.nodes.span2]: {
    width: '16px',
    height: '16px',
    background: tokenRef(exampleTokenIds.color.text.inverse),
    borderRadius: tokenRef(exampleTokenIds.radius.full),
    flex: '0 0 16px',
  },
  [exampleFormToggleIds.nodes.div2]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '36px',
    height: '20px',
    background: tokenRef(exampleTokenIds.color.accent.default),
    border: '2px solid transparent',
    borderRadius: tokenRef(exampleTokenIds.radius.full),
    justifyContent: 'flex-end',
  },
  [exampleFormToggleIds.nodes.span3]: {
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.caption),
  },
  [exampleFormToggleIds.nodes.div1]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokenRef(exampleTokenIds.space.scale.step2),
    width: 'auto',
    height: 'auto',
  },
  [exampleFormToggleIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokenRef(exampleTokenIds.space.scale.step4),
    width: '100%',
    height: 'auto',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
