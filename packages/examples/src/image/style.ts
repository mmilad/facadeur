import type { ExampleStyleMap } from '../register-example-styles';
import { ids as exampleImageIds } from './idList';

export const styles = {
  [exampleImageIds.nodes.root]: {
    width: '100%',
    height: 'auto',
    display: 'block',
    objectFit: 'cover',
    maxWidth: '100%',
    aspectRatio: '16 / 9',
  },
} satisfies ExampleStyleMap;
