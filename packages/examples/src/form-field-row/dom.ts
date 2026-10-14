import type { Node } from '@facadeur/domain';
import { ids as exampleFormFieldRowIds } from './idList';

export const root: Node = {
  uuid: exampleFormFieldRowIds.nodes.root,
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: exampleFormFieldRowIds.nodes.span1,
        dom: {
          tagName: 'span',
          text: 'label',
        },
      },
      {
        uuid: exampleFormFieldRowIds.nodes.span2,
        dom: {
          tagName: 'span',
          text: 'Text',
        },
      },
      {
        uuid: exampleFormFieldRowIds.nodes.span3,
        dom: {
          tagName: 'span',
          text: 'Continue',
        },
      },
    ],
  },
};
