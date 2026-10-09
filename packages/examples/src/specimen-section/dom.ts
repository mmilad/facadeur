import type { Node } from '@facadeur/domain';
import { ids as exampleButtonIds } from '../button/idList';
import { ids as exampleCardIds } from '../card/idList';
import { ids as exampleInputIds } from '../input/idList';
import { ids as exampleSignInIds } from '../sign-in/idList';
import { ids as exampleSpecimenSectionIds } from './idList';

export const root: Node = {
  uuid: exampleSpecimenSectionIds.nodes.root,
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: exampleSpecimenSectionIds.nodes.div1,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleSpecimenSectionIds.nodes.p1,
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'facadeur',
                },
              },
            },
            {
              uuid: exampleSpecimenSectionIds.nodes.h11,
              dom: {
                tagName: 'h1',
                properties: {
                  textContent: 'Specimen',
                },
              },
            },
            {
              uuid: exampleSpecimenSectionIds.nodes.p2,
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
        uuid: exampleSpecimenSectionIds.nodes.div2,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleSpecimenSectionIds.nodes.p3,
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'Button',
                },
              },
            },
            {
              uuid: exampleSpecimenSectionIds.nodes.div3,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleSpecimenSectionIds.nodes.div4,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleButtonIds.definition,
                      previewData: {
                        fields: {
                          label: 'Primary',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleSpecimenSectionIds.nodes.div5,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleButtonIds.definition,
                      previewData: {
                        fields: {
                          label: 'Secondary',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleSpecimenSectionIds.nodes.div6,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleButtonIds.definition,
                      previewData: {
                        fields: {
                          label: 'Ghost',
                        },
                      },
                    },
                  },
                  {
                    uuid: exampleSpecimenSectionIds.nodes.div7,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleButtonIds.definition,
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
        uuid: exampleSpecimenSectionIds.nodes.div8,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleSpecimenSectionIds.nodes.p4,
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'Input',
                },
              },
            },
            {
              uuid: exampleSpecimenSectionIds.nodes.div9,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleSpecimenSectionIds.nodes.div10,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleInputIds.definition,
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
                    uuid: exampleSpecimenSectionIds.nodes.div11,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleInputIds.definition,
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
        uuid: exampleSpecimenSectionIds.nodes.div12,
        dom: {
          tagName: 'div',
          children: [
            {
              uuid: exampleSpecimenSectionIds.nodes.p5,
              dom: {
                tagName: 'p',
                properties: {
                  textContent: 'Card',
                },
              },
            },
            {
              uuid: exampleSpecimenSectionIds.nodes.div13,
              dom: {
                tagName: 'div',
                children: [
                  {
                    uuid: exampleSpecimenSectionIds.nodes.div14,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleCardIds.definition,
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
                    uuid: exampleSpecimenSectionIds.nodes.div15,
                    dom: {
                      tagName: 'div',
                    },
                    config: {
                      definitionRef: exampleSignInIds.definition,
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
