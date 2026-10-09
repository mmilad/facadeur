import type { Node } from '@facadeur/domain';
import { ids as exampleTextHeadingIds } from './idList';

export const root: Node = {
  uuid: exampleTextHeadingIds.nodes.root,
  data: {
    name: 'Heading',
  },
  dom: {
    tagName: 'h2',
    properties: {
      textContent: 'Section title',
    },
  },
};
