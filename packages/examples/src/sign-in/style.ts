import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleSignInIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleSignInIds.nodes.p1]: {
    color: tokenRef(exampleTokenIds.color.accent.default),
    font: tokenRef(exampleTokenIds.type.caption),
    letterSpacing: '0.16em',
    margin: tokenRef(exampleTokenIds.space.scale.step0),
    textTransform: 'uppercase',
  },
  [exampleSignInIds.nodes.h21]: {
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.title),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleSignInIds.nodes.p2]: {
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.body),
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleSignInIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokenRef(exampleTokenIds.space.gap.md),
    padding: tokenRef(exampleTokenIds.space.inset.lg),
    width: '100%',
    height: 'auto',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: tokenRef(exampleTokenIds.radius.md),
    boxShadow: tokenRef(exampleTokenIds.shadow.md),
  },
} satisfies ExampleStyleMap;
