import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-8f7fc3f2f8ee',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-ade185dfdbf3',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Message',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-b9e0579593a3',
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
