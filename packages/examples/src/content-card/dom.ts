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
          previewData: {
            fields: {
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='405'%3E%3Crect fill='%23e0e7ff' width='720' height='405'/%3E%3Ccircle cx='560' cy='96' r='48' fill='%23818cf8'/%3E%3Cpath d='M0 405L240 140L400 320L520 210L720 405Z' fill='%234f46e5'/%3E%3C/svg%3E",
              alt: 'Abstract landscape',
            },
          },
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
                previewData: {
                  fields: {
                    text: 'Design with confidence',
                  },
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-8bea6ada581a',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-b51f086c1669',
                previewData: {
                  fields: {
                    text: 'Reusable components, shared tokens, and clear field contracts for humans and agents.',
                  },
                },
              },
            },
          ],
        },
      },
    ],
  },
};
