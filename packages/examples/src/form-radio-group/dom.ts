import type { Node } from '@facadeur/domain';
import { ids as exampleFormRadioGroupIds } from './idList';
import { ids as exampleFormRadioOptionIds } from '../form-radio-option/idList';

export const root: Node = {
  uuid: exampleFormRadioGroupIds.nodes.root,
  dom: {
    tagName: 'div',
    attributes: {
      role: 'radiogroup',
    },
    children: [
      {
        uuid: exampleFormRadioGroupIds.nodes.div1,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleFormRadioGroupIds.nodes.div2,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleFormRadioOptionIds.definition,
                previewData: {
                  fields: {
                    label: 'item.label',
                    value: 'item.value',
                    disabled: 'item.disabled',
                    checked: 'item.checked',
                    name: 'radio-choices',
                  },
                },
              },
            },
          ],
        },
      },
    ],
  },
};
