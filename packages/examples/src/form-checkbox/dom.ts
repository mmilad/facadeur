import type { Node } from '@facadeur/domain';
import { ids as exampleFormCheckboxIds } from './idList';

export const root: Node = {
  uuid: exampleFormCheckboxIds.nodes.root,
  data: {
    name: 'Checkbox',
  },
  dom: {
    tagName: 'input',
    attributes: {
      type: 'checkbox',
      value: 'yes',
      name: 'accepted',
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
