import type { Node } from '@facadeur/domain';
import { ids as exampleLinkIds } from './idList';

export const root: Node = {
  uuid: exampleLinkIds.nodes.root,
  dom: {
    tagName: 'a',
    attributes: {
      href: '#components',
    },
    properties: {
      textContent: 'Explore components',
    },
  },
};
