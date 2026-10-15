import type { ExampleStyleMap } from '../register-example-styles';
import { tokenIds as exampleTokenIds } from '../catalog/tokens/idList';
import { ids as exampleFormRadioGroupIds } from './idList';
import { tokenRef } from '../references';

export const styles = {
  [exampleFormRadioGroupIds.nodes.root]: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokenRef(exampleTokenIds.space.scale.step2),
  },
} satisfies ExampleStyleMap;
