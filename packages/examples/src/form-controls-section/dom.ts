import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-9280c3526fdf',
  dom: {
    tagName: 'main',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-43207c0dd461',
        dom: {
          tagName: 'header',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-80269a146dcc',
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'facadeur · editor kit',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-a5a5b8692ac7',
              dom: {
                tagName: 'h1',
                properties: {
                  textContent: 'Controls',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-f2b8cc8c21ad',
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'A small, token-driven control language for the editor inspector.',
                },
              },
            },
          ],
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-fd4f818e0979',
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-651400484f10',
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Native text controls',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-361db59c8d50',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-c4883b98f72e',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-25e4cf782bd0',
                      previewData: {
                        fields: {
                          label: 'Input',
                          value: 'Value',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-2bdc5b650ef6',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-938b3e6cebc9',
                      previewData: {
                        fields: {
                          label: 'Textarea',
                          value: 'Write a message',
                          rows: 3,
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
        uuid: '550e8400-e29b-41d4-a716-6481df4e9979',
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-7e7e2149da7b',
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Text field states',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-bd900793cbe7',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-e24d2274ea9b',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-5b0d897613d9',
                      previewData: {
                        fields: {
                          label: 'Label',
                          value: 'Button',
                          hint: 'Default',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-87a144b7fc60',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-5b0d897613d9',
                      previewData: {
                        fields: {
                          label: 'Label',
                          value: 'Button',
                          hint: 'Focused',
                          hasIcon: true,
                          icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ccircle cx=%226.5%22 cy=%226.5%22 r=%223.5%22 fill=%22none%22 stroke=%22%236f675e%22 stroke-width=%221.5%22/%3E%3Cpath d=%22m9.2 9.2 4.2 4.2%22 fill=%22none%22 stroke=%22%236f675e%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-1f8ee1d5ffb5',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-5b0d897613d9',
                      previewData: {
                        fields: {
                          label: 'Label',
                          value: 'Button',
                          hint: 'Invalid value',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-b92066be3b26',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-5b0d897613d9',
                      previewData: {
                        fields: {
                          label: 'Label',
                          value: 'Disabled',
                          hint: 'Disabled',
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
        uuid: '550e8400-e29b-41d4-a716-6510a1394894',
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-57dbc9b5a6f4',
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Selection and options',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-4fc06ca21d9e',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-05dd9039d109',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f8e2f06df0c0',
                      previewData: {
                        fields: {
                          label: 'Token',
                          value: 'color.text.primary',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-71a4f36efca2',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f8e2f06df0c0',
                      previewData: {
                        fields: {
                          label: 'Property',
                          value: 'border color',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-5291b3f89b45',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f8e2f06df0c0',
                      previewData: {
                        fields: {
                          label: 'Breakpoint',
                          value: 'Base',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-660046e254aa',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-7f116e554c91',
                      previewData: {
                        fields: {
                          label: 'Alignment',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-23fc6c60f37d',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f2a049c2b58c',
                      previewData: {
                        fields: {
                          label: 'Use token',
                          value: 'On',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-d44188855366',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f2a049c2b58c',
                      previewData: {
                        fields: {
                          label: 'Use token',
                          value: 'Off',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-7e54bf99bd69',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f2a049c2b58c',
                      previewData: {
                        fields: {
                          label: 'Use token',
                          value: 'Disabled',
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
        uuid: '550e8400-e29b-41d4-a716-8dd87b56aa44',
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-193e0fb22803',
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Field definition',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-7a555a28cf19',
              dom: {
                tagName: 'p',
                properties: {
                  textContent:
                    'Compact rows keep component definitions scannable; details can open on demand.',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-ee20bb561fa2',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-4d8c265fc6b4',
                    dom: {
                      tagName: 'div',
                      children: [
                        {
                          uuid: '550e8400-e29b-41d4-a716-8201e3dd29e8',
                          dom: {
                            tagName: 'span',
                            properties: {
                              textContent: 'Name',
                            },
                          },
                        },
                        {
                          uuid: '550e8400-e29b-41d4-a716-cc5f9aec8fcc',
                          dom: {
                            tagName: 'span',
                            properties: {
                              textContent: 'Type',
                            },
                          },
                        },
                        {
                          uuid: '550e8400-e29b-41d4-a716-901a40affa58',
                          dom: {
                            tagName: 'span',
                            properties: {
                              textContent: 'Default',
                            },
                          },
                        },
                      ],
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-19c3680a430b',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0ad56ad3cd47',
                      previewData: {
                        fields: {
                          name: 'label',
                          type: 'text',
                          value: 'Button',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-4a4e8e443ef3',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0ad56ad3cd47',
                      previewData: {
                        fields: {
                          name: 'tone',
                          type: 'enum',
                          value: 'primary',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-fe1ffa36c96e',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-0ad56ad3cd47',
                      previewData: {
                        fields: {
                          name: 'disabled',
                          type: 'boolean',
                          value: 'false',
                        },
                      },
                    },
                  },
                ],
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-fea978fe42d5',
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: '550e8400-e29b-41d4-a716-0000000003e9',
                previewData: {
                  fields: {
                    label: '+ Add field',
                  },
                },
              },
            },
          ],
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-512672ca1308',
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: '550e8400-e29b-41d4-a716-c6fd7caed91d',
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Data-driven form',
                },
              },
            },
            {
              uuid: '550e8400-e29b-41d4-a716-af432fa6c60e',
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: '550e8400-e29b-41d4-a716-7556179df652',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-5b0d897613d9',
                      previewData: {
                        fields: {
                          label: 'field.label',
                          hint: 'field.hint',
                          value: 'field.value',
                          placeholder: 'field.placeholder',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-f5f4f9411e01',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-938b3e6cebc9',
                      previewData: {
                        fields: {
                          label: 'field.label',
                          value: 'field.value',
                          placeholder: 'field.placeholder',
                          rows: 'field.rows',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-0b0aa9b18bcf',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f8e2f06df0c0',
                      previewData: {
                        fields: {
                          label: 'field.label',
                          value: 'field.value',
                        },
                      },
                    },
                  },
                  {
                    uuid: '550e8400-e29b-41d4-a716-84e342c1a0de',
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: '550e8400-e29b-41d4-a716-f2a049c2b58c',
                      previewData: {
                        fields: {
                          label: 'field.label',
                          value: 'field.value',
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
    ],
  },
};
