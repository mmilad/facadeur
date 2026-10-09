import type { Node } from '@facadeur/domain';
import { componentPropRef } from '../references';
import { propIds } from './schema';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-000000000067',
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-ca420a0f1a23',
        name: 'eyebrow',
        dom: {
          tagName: 'p',
          text: componentPropRef(propIds.eyebrow),
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-d842df7ffcf0',
        name: 'title',
        dom: {
          tagName: 'h2',
          text: componentPropRef(propIds.title),
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-8dad5919789d',
        name: 'body',
        dom: {
          tagName: 'p',
          text: componentPropRef(propIds.body),
        },
      },
    ],
  },
};
