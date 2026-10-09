import type { Node } from '@facadeur/domain';
import { componentPropRef } from '../references';
import { propIds } from './schema';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-000000000003',
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
