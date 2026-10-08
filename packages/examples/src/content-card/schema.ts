import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  required: ['title', 'imageSrc'],
  properties: {
    title: {
      type: 'string',
    },
    body: {
      type: 'string',
      default: '',
    },
    imageSrc: {
      type: 'string',
    },
    imageAlt: {
      type: 'string',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
