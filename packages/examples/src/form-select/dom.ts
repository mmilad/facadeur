import type { Node } from '@facadeur/domain';
import { ids as exampleFormSelectIds } from './idList';

export const root: Node = {
  uuid: exampleFormSelectIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleFormSelectIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Property',
          },
        },
      },
      {
        uuid: exampleFormSelectIds.nodes.div1,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleFormSelectIds.nodes.span2,
              dom: {
                tagName: 'span',
                properties: {
                  textContent: 'Background',
                },
              },
            },
            {
              uuid: exampleFormSelectIds.nodes.img1,
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
