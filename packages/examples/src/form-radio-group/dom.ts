import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-56c34e4f5862',
  dom: {
    tagName: 'div',
    attributes: {
      role: 'radiogroup',
    },
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-eb0094021680',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-f18da5d7f746',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-6fbc62ed2b99',
                previewData: {
                  fields: {
                    label: 'item.label',
                    value: 'item.value',
                    disabled: 'item.disabled',
                    checked: 'item.checked',
                    name: 'name',
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
