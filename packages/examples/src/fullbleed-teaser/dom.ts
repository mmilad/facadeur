import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-00000000006b',
  data: {
    name: 'Teaser',
  },
  dom: {
    tagName: 'section',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-b5ddc99a5c38',
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: '550e8400-e29b-41d4-a716-000000000002',
          previewData: {
            fields: {
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%231e3a8a'/%3E%3Cstop offset='1' stop-color='%233b82f6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1280' height='720' fill='url(%23g)'/%3E%3C/svg%3E",
              alt: 'Blue gradient hero',
            },
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-1cc03f1f8f62',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-8b704bf6eabf',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-dacc33ed3990',
                previewData: {
                  fields: {
                    text: 'Build pages from clear contracts',
                  },
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-abdaf56d3194',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-b51f086c1669',
                previewData: {
                  fields: {
                    text: 'Atoms and components with explicit fields agents can read and authors can preview.',
                  },
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-03b8b9a838a4',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-9f7d1ebdd36d',
                previewData: {
                  fields: {
                    label: 'Read the docs',
                    href: '#docs',
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
