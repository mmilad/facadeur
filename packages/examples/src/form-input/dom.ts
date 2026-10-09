import type { Node } from '@facadeur/domain';
import { ids as exampleFormInputIds } from './idList';

export const root: Node = {
  uuid: exampleFormInputIds.nodes.root,
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
