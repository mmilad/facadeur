import type { Node } from '@facadeur/domain';
import { ids as exampleFormRadioIds } from './idList';

export const root: Node = {
  uuid: exampleFormRadioIds.nodes.root,
  data: {
    name: 'Radio',
  },
  dom: {
    tagName: 'input',
    attributes: {
      type: 'radio',
      value: 'first',
      name: 'choice',
    },
    properties: {
      checked: false,
      disabled: false,
    },
    event: {
      change: {
        event: 'change',
        name: 'change',
        data: [
          {
            path: 'checked',
            source: {
              kind: 'native',
              path: 'currentTarget.checked',
            },
          },
        ],
      },
    },
  },
};
