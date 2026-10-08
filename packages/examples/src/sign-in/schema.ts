import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    eyebrow: {
      type: 'string',
    },
    title: {
      type: 'string',
    },
    body: {
      type: 'string',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
