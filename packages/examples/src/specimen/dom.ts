import type { Node } from '@facadeur/domain';
import { ids as exampleSpecimenIds } from './idList';
import { ids as exampleSpecimenSectionIds } from '../specimen-section/idList';

export const root: Node = {
  uuid: exampleSpecimenIds.nodes.root,
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: exampleSpecimenIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleSpecimenSectionIds.definition,
        },
      },
    ],
  },
};
