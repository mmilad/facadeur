import type { Node } from '@facadeur/domain';
import { ids as exampleFormRadioIds } from '../form-radio/idList';
import { ids as exampleFormRadioOptionIds } from './idList';

export const root: Node = {
  uuid: exampleFormRadioOptionIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleFormRadioOptionIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleFormRadioIds.definition,
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
        uuid: exampleFormRadioOptionIds.nodes.span1,
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
