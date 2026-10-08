import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-2620dd1e25d5',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-dda552506ce3',
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: '550e8400-e29b-41d4-a716-f031a6662752',
          previewData: {
            fields: {
              value: 'value',
              disabled: 'disabled',
              checked: 'checked',
              name: 'name',
            },
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-2c2977bea9a5',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Option',
          },
        },
      },
    ],
  },
};
