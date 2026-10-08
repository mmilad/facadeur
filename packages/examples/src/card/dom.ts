import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-000000000067',
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-ca420a0f1a23',
        dom: {
          tagName: 'p',
          properties: {
            textContent: 'Featured story',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-d842df7ffcf0',
        dom: {
          tagName: 'h2',
          properties: {
            textContent: 'Design with confidence',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-8dad5919789d',
        dom: {
          tagName: 'p',
          properties: {
            textContent: 'Build reusable components with shared tokens and flexible variants.',
          },
        },
      },
    ],
  },
};
