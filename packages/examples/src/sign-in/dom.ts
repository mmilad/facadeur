import type { Node } from '@facadeur/domain';
import { ids as exampleButtonIds } from '../button/idList';
import { ids as exampleInputIds } from '../input/idList';
import { ids as exampleSignInIds } from './idList';

export const root: Node = {
  uuid: exampleSignInIds.nodes.root,
  dom: {
    tagName: 'article',
    children: [
      {
        uuid: exampleSignInIds.nodes.p1,
        dom: {
          tagName: 'p',
          properties: {
            textContent: 'Welcome back',
          },
        },
      },
      {
        uuid: exampleSignInIds.nodes.h21,
        dom: {
          tagName: 'h2',
          properties: {
            textContent: 'Sign in to your workspace',
          },
        },
      },
      {
        uuid: exampleSignInIds.nodes.p2,
        dom: {
          tagName: 'p',
          properties: {
            textContent: 'Continue with your work email to access your projects.',
          },
        },
      },
      {
        uuid: exampleSignInIds.nodes.div1,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleInputIds.definition,
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
        uuid: exampleSignInIds.nodes.div2,
        dom: {
          tagName: 'div',
        },
        config: {
          definitionRef: exampleButtonIds.definition,
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
