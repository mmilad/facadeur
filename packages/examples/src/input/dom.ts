import type { Node } from '@facadeur/domain';
import { ids as exampleFormInputIds } from '../form-input/idList';
import { ids as exampleInputIds } from './idList';

export const root: Node = {
  uuid: exampleInputIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleInputIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Work emails',
          },
        },
      },
      {
        uuid: exampleInputIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleFormInputIds.definition,
          previewData: {
            fields: {
              disabled: false,
            },
          },
        },
      },
    ],
  },
};
