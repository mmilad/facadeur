import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-64d9ed44892c',
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-aa07dab0544c',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Alignment',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-96a4b1bd6698',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-95faca7338cc',
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'Start',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-c4551fd94aa1',
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'Center',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-5f3ab07637c4',
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'End',
                },
              },
            },
          ],
        },
      },
    ],
  },
};
