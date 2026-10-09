import type { Node } from '@facadeur/domain';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFullbleedTeaserIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFullbleedTeaserIds.nodes.div1]: {
    width: '100%',
    height: 'auto',
  },
  [exampleFullbleedTeaserIds.nodes.div3]: {
    width: '100%',
    height: 'auto',
  },
  [exampleFullbleedTeaserIds.nodes.div4]: {
    width: '100%',
    height: 'auto',
  },
  [exampleFullbleedTeaserIds.nodes.div5]: {
    width: 'auto',
    height: 'auto',
  },
  [exampleFullbleedTeaserIds.nodes.div2]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '{layout.gap}',
    padding: '{layout.padding}',
    width: '100%',
    height: '100%',
    inset: '0',
  },
  [exampleFullbleedTeaserIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: '100%',
    height: 'auto',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    boxSizing: 'border-box',
    overflow: 'hidden',
    minHeight: '1px',
    position: 'relative',
  },
} satisfies Readonly<Record<string, NonNullable<Node['style']>>>;
