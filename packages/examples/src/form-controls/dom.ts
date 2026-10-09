import type { Node } from '@facadeur/domain';
import { ids as exampleFormControlsIds } from './idList';
import { ids as exampleFormControlsSectionIds } from '../form-controls-section/idList';

export const root: Node = {
  uuid: exampleFormControlsIds.nodes.root,
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: exampleFormControlsIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleFormControlsSectionIds.definition,
        },
      },
    ],
  },
};
