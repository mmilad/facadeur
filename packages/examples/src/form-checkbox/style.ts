import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormCheckboxIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormCheckboxIds.nodes.root]: {
    accentColor: tokenRef(exampleTokenIds.color.accent.default),
    width: '16px',
    height: '16px',
  },
} satisfies ExampleStyleMap;
