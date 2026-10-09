import type { Node } from '@facadeur/domain';
import { ids as exampleTextBodyIds } from './idList';

export const root: Node = {
  uuid: exampleTextBodyIds.nodes.root,
  data: {
    name: 'Body',
  },
  dom: {
    tagName: 'p',
    properties: {
      textContent: 'Supporting copy that explains the idea in one or two short sentences.',
    },
  },
};
