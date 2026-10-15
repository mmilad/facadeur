import type { ExampleStyleMap } from '../register-example-styles';
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
    gap: tokenRef(exampleTokenIds.space.gap.md),
    padding: tokenRef(exampleTokenIds.space.inset.lg),
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
} satisfies ExampleStyleMap;
