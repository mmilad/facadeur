import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-4c7812fe9f47',
  dom: {
    tagName: 'div',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-97d18fb0ecd1',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'label',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-2bbcdf8f1792',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Text',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-9f1924e8cee9',
        dom: {
          tagName: 'span',
          properties: {
            textContent: 'Continue',
          },
        },
      },
    ],
  },
};
