import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-24ba8a10ce72',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-ce12adf17782',
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: '550e8400-e29b-41d4-a716-420b18ee8a9d',
          previewData: {
            fields: {
              value: 'option',
              disabled: false,
              checked: false,
              name: 'choice',
            },
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-36ea91b7ba0c',
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
