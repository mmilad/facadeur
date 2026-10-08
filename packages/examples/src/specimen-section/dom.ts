import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-846b26a622a2',
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-256030b02e78',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-696c51aee4b3',
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'facadeur',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-15b0c28fb1f5',
              dom: {
                tagName: 'h1',
                properties: {
                  textContent: 'Specimen',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-1f2640ee02da',
              dom: {
                tagName: 'p',
                properties: {
                  textContent:
                    'Auto layout, token styles, and a sign-in card that overrides the input border for its children.',
                },
              },
            },
          ],
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-6ca76aec5e2d',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-89cb179fe85c',
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'Button',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-fbd29e8bee02',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-ab67034b6830',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0000000003e9',
                      previewData: {
                        fields: {
                          label: 'Primary',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-6c07dc262f1c',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0000000003e9',
                      previewData: {
                        fields: {
                          label: 'Secondary',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-4fbe2b8a37a7',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0000000003e9',
                      previewData: {
                        fields: {
                          label: 'Ghost',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-d64d9f6b904e',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0000000003e9',
                      previewData: {
                        fields: {
                          label: 'Small',
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-e8250fd0aee3',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-d0bfdebd4dc1',
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'Input',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-2720c9107cee',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-44199525567c',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-25e4cf782bd0',
                      previewData: {
                        fields: {
                          label: 'Email',
                          name: 'email',
                          value: 'ada@atelier.test',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-47ac2e851072',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-25e4cf782bd0',
                      previewData: {
                        fields: {
                          label: 'Search',
                          name: 'q',
                          placeholder: 'Search components',
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-84683295900a',
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-a4c53f283135',
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'Card',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-be18a7bd56fe',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-bb6c728e7cef',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0000000003ea',
                      previewData: {
                        fields: {
                          body: 'Props fill the template. Click the title, or click the card padding to select the card itself.',
                          eyebrow: 'Layout',
                          title: 'Field notes',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-f2a975940624',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0000000003ec',
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
