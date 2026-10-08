import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-dc83518369e3',
  data: {
    name: 'Input',
  },
  dom: {
    tagName: 'input',
    attributes: {
      autocomplete: 'off',
      type: 'text',
      value: '',
      placeholder: 'Enter a valueasdasdasd',
      name: 'example-input',
    },
    properties: {
      disabled: false,
    },
    event: {
      change: {
        event: 'commit',
        name: 'change',
      },
    },
  },
};
