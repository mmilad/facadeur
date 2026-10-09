import type { Node } from '@facadeur/domain';
import { ids as exampleButtonIds } from './idList';

export const root: Node = {
  uuid: exampleButtonIds.nodes.root,
  dom: {
    tagName: 'button',
    attributes: {
      type: 'button',
    },
    properties: {
      textContent: 'Continue',
    },
  },
};
