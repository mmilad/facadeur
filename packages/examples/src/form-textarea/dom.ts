import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-53f9662f70cc',
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
