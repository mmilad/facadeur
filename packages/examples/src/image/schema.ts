import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  title: 'Image',
  required: ['src'],
  properties: {
    src: {
      type: 'string',
      title: 'Source',
    },
    alt: {
      type: 'string',
      title: 'Alt text',
    },
    ratio: {
      type: 'string',
      title: 'Ratio',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
