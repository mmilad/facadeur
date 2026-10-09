import type { Node } from '@facadeur/domain';
import { componentPropRef } from '../references';
import { propIds } from './schema';
import { ids as exampleCardIds } from './idList';

export const root: Node = {
  uuid: exampleCardIds.nodes.root,
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: exampleCardIds.nodes.eyebrow,
        name: 'eyebrow',
        dom: {
          tagName: 'p',
          text: componentPropRef(propIds.eyebrow),
        },
      },
      {
        uuid: exampleCardIds.nodes.title,
        name: 'title',
        dom: {
          tagName: 'h2',
          text: componentPropRef(propIds.title),
        },
      },
      {
        uuid: exampleCardIds.nodes.body,
        name: 'body',
        dom: {
          tagName: 'p',
          text: componentPropRef(propIds.body),
        },
      },
    ],
  },
};
