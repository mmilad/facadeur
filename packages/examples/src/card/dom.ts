import type { Node } from '@facadeur/domain';

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
          text: '{props:550e8400-e29b-41d4-a716-000000000201}',
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-d842df7ffcf0',
        name: 'title',
        dom: {
          tagName: 'h2',
          text: '{props:550e8400-e29b-41d4-a716-000000000202}',
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-8dad5919789d',
        name: 'body',
        dom: {
          tagName: 'p',
          text: '{props:550e8400-e29b-41d4-a716-000000000203}',
        },
      },
    ],
  },
};
