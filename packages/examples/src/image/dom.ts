import type { Node } from '@facadeur/domain';
import { componentPropRef } from '../references';
import { propIds } from './schema';
import { ids as exampleImageIds } from './idList';

export const root: Node = {
  uuid: exampleImageIds.nodes.root,
  data: {
    name: 'Image',
  },
  dom: {
    tagName: 'img',
    attributes: {
      src: componentPropRef(propIds.src),
      alt: componentPropRef(propIds.alt),
    },
  },
};
