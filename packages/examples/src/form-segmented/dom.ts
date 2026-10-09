import type { Node } from '@facadeur/domain';
import { ids as exampleFormSegmentedIds } from './idList';

export const root: Node = {
  uuid: exampleFormSegmentedIds.nodes.root,
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: exampleFormSegmentedIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Alignment',
          },
        },
      },
      {
        uuid: exampleFormSegmentedIds.nodes.div1,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleFormSegmentedIds.nodes.span2,
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'Start',
                },
              },
            },
            {
              uuid: exampleFormSegmentedIds.nodes.span3,
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'Center',
                },
              },
            },
            {
              uuid: exampleFormSegmentedIds.nodes.span4,
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
