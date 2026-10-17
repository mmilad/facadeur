import type { ExampleStyleMap } from '../register-example-styles';
import { ids as iconIds } from './idList';

export const styles = {
  [iconIds.nodes.root]: {
    display: 'block',
    width: '24px',
    height: '24px',
    fill: 'currentColor',
    flexShrink: '0',
  },
} satisfies ExampleStyleMap;
