import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-21c869043041',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-aeecf87c99ac',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Work email',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-8ccf0e01bde2',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-13b4d4037dd8',
              dom: {
                tagName: 'img',
                attributes: {
                  'aria-hidden': 'true',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-974f46964620',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-fddc99563a28',
              },
            },
          ],
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-a8d593ad9fcf',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Use your work email address.',
          },
        },
      },
    ],
  },
};
