import type { Node } from '@facadeur/domain';

export const root: Node = {
  uuid: '550e8400-e29b-41d4-a716-00000000006f',
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: '550e8400-e29b-41d4-a716-4bcf572af571',
        dom: {
          tagName: 'p',
          properties: {
            textContent: 'Welcome back',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-cb765c804572',
        dom: {
          tagName: 'h2',
          properties: {
            textContent: 'Sign in to your workspace',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-02b3fdbd0f6a',
        dom: {
          tagName: 'p',
          properties: {
            textContent: 'Continue with your work email to access your projects.',
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-568f83442f5f',
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: '550e8400-e29b-41d4-a716-25e4cf782bd0',
          previewData: {
            fields: {
              label: 'Work email',
              value: 'ada@atelier.test',
              name: 'work-email',
            },
          },
        },
      },
      {
        uuid: '550e8400-e29b-41d4-a716-8d8f838b7756',
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: '550e8400-e29b-41d4-a716-0000000003e9',
          previewData: {
            fields: {
              label: 'Continue',
            },
          },
        },
      },
    ],
  },
};
