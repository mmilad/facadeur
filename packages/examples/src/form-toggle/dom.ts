import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-a97359bef840',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-7feb971f5e3c',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Use token',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-4bbc0bebd5af',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-db1815e7ce3e',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-f6c221efef5c',
                    dom: {
                      tagName: 'span',
                    },
                  },
                ],
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-cf6ce94972e3',
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'Enabled',
                },
              },
            },
          ],
        },
      },
    ],
  },
};
