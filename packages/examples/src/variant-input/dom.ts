import type { Node } from '@facadeur/domain';
import { ids as exampleVariantInputIds } from './idList';

export const root: Node = {
  uuid: exampleVariantInputIds.nodes.root,
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: exampleVariantInputIds.nodes.span1,
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Project name',
          },
        },
      },
      {
        uuid: exampleVariantInputIds.nodes.input1,
        dom: {
          tagName: 'input',
          attributes: {
            type: 'email',
          },
          properties: {
            textContent: 'Component library',
          },
        },
      },
    ],
  },
};
