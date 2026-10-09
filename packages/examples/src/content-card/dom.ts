import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-711653adba3d',
  data: {
    name: 'Card',
  },
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-7d669086c137',
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: '550e8400-e29b-41d4-a716-000000000002',
          fieldExposure: { mode: 'manual', fields: { src: 'imageSrc', alt: 'imageAlt' } },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-9b6904fdf010',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-b1d317d292af',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-dacc33ed3990',
                fieldExposure: { mode: 'manual', fields: { text: 'title' } },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-8bea6ada581a',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-b51f086c1669',
                fieldExposure: { mode: 'manual', fields: { text: 'body' } },
              },
            },
          ],
        },
      },
    ],
  },
};
