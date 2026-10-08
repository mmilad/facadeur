import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-60b63699ece2',
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
