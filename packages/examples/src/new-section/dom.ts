import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-c1376195f619',
  data: {
    name: 'Frame',
  },
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-9169eacd7a70',
        data: {
          name: 'Repeater',
        },
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-861d78684ad6',
              data: {
                name: 'Switch',
              },
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-04cce5527f8e',
                    data: {
                      name: 'Card',
                    },
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0000000003ea',
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-b8006f4fb316',
                    data: {
                      name: 'Textarea',
                    },
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-938b3e6cebc9',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  },
};
