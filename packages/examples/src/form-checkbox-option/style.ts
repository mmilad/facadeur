import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormCheckboxOptionIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormCheckboxOptionIds.nodes.root]: {
    display: 'flex',
    alignItems: 'center',
    gap: tokenRef(exampleTokenIds.space.scale.step2),
  },
} satisfies ExampleStyleMap;
