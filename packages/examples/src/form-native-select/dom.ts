import type { Node } from '@facadeur/domain';
import { ids as exampleFormNativeSelectIds } from './idList';

export const root: Node = {
  uuid: exampleFormNativeSelectIds.nodes.root,
  data: {
    name: 'Select',
  },
  dom: {
    tagName: 'select',
    attributes: {
      value: '',
      name: 'selection',
    },
    properties: {
      disabled: false,
    },
    event: {
      change: {
        event: 'commit',
        name: 'change',
        data: [
          {
            path: 'value',
            source: {
              kind: 'native',
              path: 'currentTarget.value',
            },
          },
        ],
      },
    },
  },
};
