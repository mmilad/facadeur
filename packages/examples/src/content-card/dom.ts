import type { Node } from '@facadeur/domain';
import { ids as exampleContentCardIds } from './idList';
import { ids as exampleImageIds } from '../image/idList';
import { ids as exampleTextBodyIds } from '../text-body/idList';
import { ids as exampleTextHeadingIds } from '../text-heading/idList';

export const root: Node = {
  uuid: exampleContentCardIds.nodes.root,
  data: {
    name: 'Card',
  },
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: exampleContentCardIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleImageIds.definition,
          fieldExposure: { mode: 'manual', fields: { src: 'imageSrc', alt: 'imageAlt' } },
        },
      },
      {
        uuid: exampleContentCardIds.nodes.div2,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleContentCardIds.nodes.div3,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleTextHeadingIds.definition,
                fieldExposure: { mode: 'manual', fields: { text: 'title' } },
              },
            },
            {
              uuid: exampleContentCardIds.nodes.div4,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleTextBodyIds.definition,
                fieldExposure: { mode: 'manual', fields: { text: 'body' } },
              },
            },
          ],
        },
      },
    ],
  },
};
