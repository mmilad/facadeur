import type { Node } from '@facadeur/domain';
import { ids as exampleFormToggleIds } from './idList';

export const root: Node = {
  uuid: exampleFormToggleIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleFormToggleIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Use token',
          },
        },
      },
      {
        uuid: exampleFormToggleIds.nodes.div1,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleFormToggleIds.nodes.div2,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleFormToggleIds.nodes.span2,
                    dom: {
                      tagName: 'span',
                    },
                  },
                ],
              },
            },
            {
              uuid: exampleFormToggleIds.nodes.span3,
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
