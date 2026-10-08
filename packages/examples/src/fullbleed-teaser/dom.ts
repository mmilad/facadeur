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
              src: 'imageSrc',
              alt: 'imageAlt',
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
                    text: 'title',
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
                    text: 'body',
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
                    label: 'ctaLabel',
                    href: 'ctaHref',
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
