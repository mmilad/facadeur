import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-f4367359df0f',
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
