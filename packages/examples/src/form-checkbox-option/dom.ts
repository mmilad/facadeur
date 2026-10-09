import type { Node } from '@facadeur/domain';
import { ids as exampleFormCheckboxIds } from '../form-checkbox/idList';
import { ids as exampleFormCheckboxOptionIds } from './idList';

export const root: Node = {
  uuid: exampleFormCheckboxOptionIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleFormCheckboxOptionIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleFormCheckboxIds.definition,
          previewData: {
            fields: {
              value: 'option',
              disabled: false,
              checked: false,
              name: 'choice',
            },
          },
        },
      },
      {
        uuid: exampleFormCheckboxOptionIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Option',
          },
        },
      },
    ],
  },
};
