import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormInputIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormInputIds.nodes.root]: {
    width: '100%',
    height: 'auto',
    appearance: 'none',
    background: tokenRef(exampleTokenIds.color.bg.canvas),
    border: '1px solid ' + tokenRef(exampleTokenIds.color.border.default),
    borderRadius: tokenRef(exampleTokenIds.radius.md),
    boxSizing: 'border-box',
    color: tokenRef(exampleTokenIds.color.text.primary),
    font: tokenRef(exampleTokenIds.type.body),
    paddingBlock: tokenRef(exampleTokenIds.space.inset.xs),
    paddingInline: tokenRef(exampleTokenIds.space.inset.sm),
  },
} satisfies ExampleStyleMap;
