import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleInputIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleInputIds.nodes.span1]: {
    margin: tokenRef(exampleTokenIds.space.scale.step0),
  },
  [exampleInputIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: tokenRef(exampleTokenIds.space.gap.xs),
    width: '100%',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.text.secondary),
    font: tokenRef(exampleTokenIds.type.label),
  },
} satisfies ExampleStyleMap;
