import type { Node } from '@facadeur/domain';
import { componentPropRef } from '../references';
import { ids as iconIds } from './idList';
import { propIds } from './schema';

export const root: Node = {
  uuid: iconIds.nodes.root,
  name: 'Icon',
  dom: {
    tagName: 'svg',
    attributes: {
      'data-icon': componentPropRef(propIds.icon),
      'aria-hidden': 'true',
      focusable: 'false',
    },
  },
};
