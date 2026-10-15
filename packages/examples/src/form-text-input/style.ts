import type { ExampleStyleMap } from '../register-example-styles';
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
    marginInlineEnd: tokenRef(exampleTokenIds.space.gap.md),
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
    borderRadius: tokenRef(exampleTokenIds.radius.md),
    paddingBlock: tokenRef(exampleTokenIds.space.inset.xs),
    paddingInline: tokenRef(exampleTokenIds.space.inset.sm),
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
    gap: tokenRef(exampleTokenIds.space.gap.md),
    width: '100%',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.body),
  },
} satisfies ExampleStyleMap;
