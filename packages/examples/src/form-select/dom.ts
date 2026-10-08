import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-77565a320196',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-4836151d3102',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Property',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-96cc520f2893',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-53a58fd11298',
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'Background',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-fc3f9316496d',
              dom: {
                tagName: 'img',
                attributes: {
                  'aria-hidden': 'true',
                },
              },
            },
          ],
        },
      },
    ],
  },
};
