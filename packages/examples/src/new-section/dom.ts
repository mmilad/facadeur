import type { Node } from '@facadeur/domain';
import { ids as exampleCardIds } from '../card/idList';
import { ids as exampleNewSectionIds } from './idList';
import { ids as exampleTextareaIds } from '../textarea/idList';

export const root: Node = {
  uuid: exampleNewSectionIds.nodes.root,
  data: {
    name: 'Frame',
  },
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: exampleNewSectionIds.nodes.div1,
        data: {
          name: 'Repeater',
        },
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleNewSectionIds.nodes.div2,
              data: {
                name: 'Switch',
              },
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleNewSectionIds.nodes.div3,
                    data: {
                      name: 'Card',
                    },
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleCardIds.definition,
                    },
                  },
                  {
                    uuid: exampleNewSectionIds.nodes.div4,
                    data: {
                      name: 'Textarea',
                    },
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleTextareaIds.definition,
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
