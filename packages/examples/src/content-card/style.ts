import type { ExampleStyleMap } from '../register-example-styles';
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
    gap: tokenRef(exampleTokenIds.space.gap.md),
    padding: tokenRef(exampleTokenIds.space.inset.lg),
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
    borderRadius: tokenRef(exampleTokenIds.radius.md),
    boxShadow: tokenRef(exampleTokenIds.shadow.md),
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
} satisfies ExampleStyleMap;
