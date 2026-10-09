import type { Node } from '@facadeur/domain';
import { ids as exampleFormTextareaIds } from './idList';

export const root: Node = {
  uuid: exampleFormTextareaIds.nodes.root,
  data: {
    name: 'Textarea',
  },
  dom: {
    tagName: 'textarea',
    attributes: {
      value: '',
      placeholder: 'Enter a message',
      name: 'message',
      rows: '3',
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
