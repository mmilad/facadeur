import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormCheckboxGroupIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormCheckboxGroupIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokenRef(exampleTokenIds.space.scale.step2),
  },
} satisfies ExampleStyleMap;
