import type { Node } from '@facadeur/domain';
import { ids as exampleTextareaIds } from './idList';

export const root: Node = {
  uuid: exampleTextareaIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleTextareaIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Message',
          },
        },
      },
      {
        uuid: exampleTextareaIds.nodes.textarea1,
        dom: {
          tagName: 'textarea',
          attributes: {
            readonly: 'readonly',
            tabindex: '-1',
            placeholder: 'Tell us about your project',
            name: 'message',
            rows: '3',
          },
          properties: {
            textContent: '',
          },
        },
      },
    ],
  },
};
