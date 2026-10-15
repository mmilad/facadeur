import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleLinkIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleLinkIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: 'auto',
    height: 'auto',
    color: tokenRef(exampleTokenIds.color.accent.default),
    font: tokenRef(exampleTokenIds.type.label),
    textDecoration: 'underline',
    textUnderlineOffset: '0.15em',
  },
} satisfies ExampleStyleMap;
