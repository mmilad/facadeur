import type { Node } from '@facadeur/domain';
import { ids as exampleButtonIds } from '../button/idList';
import { ids as exampleFormControlsSectionIds } from './idList';
import { ids as exampleFormFieldRowIds } from '../form-field-row/idList';
import { ids as exampleFormSegmentedIds } from '../form-segmented/idList';
import { ids as exampleFormSelectIds } from '../form-select/idList';
import { ids as exampleFormTextInputIds } from '../form-text-input/idList';
import { ids as exampleFormToggleIds } from '../form-toggle/idList';
import { ids as exampleInputIds } from '../input/idList';
import { ids as exampleTextareaIds } from '../textarea/idList';

export const root: Node = {
  uuid: exampleFormControlsSectionIds.nodes.root,
  dom: {
    tagName: 'main',
    children: [
      {
        uuid: exampleFormControlsSectionIds.nodes.header1,
        dom: {
          tagName: 'header',
          children: [
            {
              uuid: exampleFormControlsSectionIds.nodes.p1,
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'facadeur · editor kit',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.h11,
              dom: {
                tagName: 'h1',
                properties: {
                  textContent: 'Controls',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.p2,
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
        uuid: exampleFormControlsSectionIds.nodes.section1,
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: exampleFormControlsSectionIds.nodes.h21,
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Native text controls',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.div1,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div2,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleInputIds.definition,
                      previewData: {
                        fields: {
                          label: 'Input',
                          value: 'Value',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div3,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleTextareaIds.definition,
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
        uuid: exampleFormControlsSectionIds.nodes.section2,
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: exampleFormControlsSectionIds.nodes.h22,
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Text field states',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.div4,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div5,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormTextInputIds.definition,
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
                    uuid: exampleFormControlsSectionIds.nodes.div6,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormTextInputIds.definition,
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
                    uuid: exampleFormControlsSectionIds.nodes.div7,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormTextInputIds.definition,
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
                    uuid: exampleFormControlsSectionIds.nodes.div8,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormTextInputIds.definition,
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
        uuid: exampleFormControlsSectionIds.nodes.section3,
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: exampleFormControlsSectionIds.nodes.h23,
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Selection and options',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.div9,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div10,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormSelectIds.definition,
                      previewData: {
                        fields: {
                          label: 'Token',
                          value: 'color.text.primary',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div11,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormSelectIds.definition,
                      previewData: {
                        fields: {
                          label: 'Property',
                          value: 'border color',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div12,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormSelectIds.definition,
                      previewData: {
                        fields: {
                          label: 'Breakpoint',
                          value: 'Base',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div13,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormSegmentedIds.definition,
                      previewData: {
                        fields: {
                          label: 'Alignment',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div14,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormToggleIds.definition,
                      previewData: {
                        fields: {
                          label: 'Use token',
                          value: 'On',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div15,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormToggleIds.definition,
                      previewData: {
                        fields: {
                          label: 'Use token',
                          value: 'Off',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div16,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormToggleIds.definition,
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
        uuid: exampleFormControlsSectionIds.nodes.section4,
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: exampleFormControlsSectionIds.nodes.h24,
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Field definition',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.p3,
              dom: {
                tagName: 'p',
                properties: {
                  textContent:
                    'Compact rows keep component definitions scannable; details can open on demand.',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.div17,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div18,
                    dom: {
                      tagName: 'div',
                      children: [
                        {
                          uuid: exampleFormControlsSectionIds.nodes.span1,
                          dom: {
                            tagName: 'span',
                            properties: {
                              textContent: 'Name',
                            },
                          },
                        },
                        {
                          uuid: exampleFormControlsSectionIds.nodes.span2,
                          dom: {
                            tagName: 'span',
                            properties: {
                              textContent: 'Type',
                            },
                          },
                        },
                        {
                          uuid: exampleFormControlsSectionIds.nodes.span3,
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
                    uuid: exampleFormControlsSectionIds.nodes.div19,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormFieldRowIds.definition,
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
                    uuid: exampleFormControlsSectionIds.nodes.div20,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormFieldRowIds.definition,
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
                    uuid: exampleFormControlsSectionIds.nodes.div21,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormFieldRowIds.definition,
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
              uuid: exampleFormControlsSectionIds.nodes.div22,
              dom: {
                tagName: 'div',
              },
              config: {
                definitionRef: exampleButtonIds.definition,
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
        uuid: exampleFormControlsSectionIds.nodes.section5,
        dom: {
          tagName: 'section',
          children: [
            {
              uuid: exampleFormControlsSectionIds.nodes.h25,
              dom: {
                tagName: 'h2',
                properties: {
                  textContent: 'Data-driven form',
                },
              },
            },
            {
              uuid: exampleFormControlsSectionIds.nodes.div23,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div24,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormTextInputIds.definition,
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
                    uuid: exampleFormControlsSectionIds.nodes.div25,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleTextareaIds.definition,
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
                    uuid: exampleFormControlsSectionIds.nodes.div26,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormSelectIds.definition,
                      previewData: {
                        fields: {
                          label: 'field.label',
                          value: 'field.value',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleFormControlsSectionIds.nodes.div27,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleFormToggleIds.definition,
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
