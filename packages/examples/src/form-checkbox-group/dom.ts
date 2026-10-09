import type { Node } from '@facadeur/domain';
import { ids as exampleFormCheckboxGroupIds } from './idList';
import { ids as exampleFormCheckboxOptionIds } from '../form-checkbox-option/idList';

export const root: Node = {
  uuid: exampleFormCheckboxGroupIds.nodes.root,
  dom: {
    tagName: 'div',
    attributes: {
      role: 'group',
    },
    children: [
      {
        uuid: exampleFormCheckboxGroupIds.nodes.div1,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleFormCheckboxGroupIds.nodes.div2,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleFormCheckboxOptionIds.definition,
                previewData: {
                  fields: {
                    label: 'item.label',
                    value: 'item.value',
                    disabled: 'item.disabled',
                    checked: 'item.checked',
                    name: 'checkbox-choices',
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
