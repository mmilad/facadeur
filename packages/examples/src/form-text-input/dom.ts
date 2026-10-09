import type { Node } from '@facadeur/domain';
import { ids as exampleFormInputIds } from '../form-input/idList';
import { ids as exampleFormTextInputIds } from './idList';

export const root: Node = {
  uuid: exampleFormTextInputIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleFormTextInputIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Work email',
          },
        },
      },
      {
        uuid: exampleFormTextInputIds.nodes.div1,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleFormTextInputIds.nodes.img1,
              dom: {
                tagName: 'img',
                attributes: {
                  'aria-hidden': 'true',
                },
              },
            },
            {
              uuid: exampleFormTextInputIds.nodes.div2,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleFormInputIds.definition,
              },
            },
          ],
        },
      },
      {
        uuid: exampleFormTextInputIds.nodes.span2,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Use your work email address.',
          },
        },
      },
    ],
  },
};
