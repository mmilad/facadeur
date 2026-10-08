import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-1c2bd8104e2f',
  dom: {
    tagName: 'label',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-5e2d005c9f6f',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Project name',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-bea1b5583c3d',
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
