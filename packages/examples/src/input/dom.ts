import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-e7e9046fa872',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-2222780064fe',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Work emails',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-c4505aaf2c98',
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: '550e8400-e29b-41d4-a716-fddc99563a28',
          previewData: {
            fields: {
              disabled: false,
            },
          },
        },
      },
    ],
  },
};
