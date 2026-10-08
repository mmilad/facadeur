import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-46b80f2bcb22',
  dom: {
    tagName: 'div',
    attributes: {
      role: 'group',
    },
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-9f0be075482b',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-002927afd21d',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-653826bd99a3',
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
