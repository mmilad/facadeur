import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  title: 'Video',
  required: ['src'],
  properties: {
    src: {
      type: 'string',
      title: 'Source',
    },
    poster: {
      type: 'string',
      title: 'Poster',
    },
    ratio: {
      type: 'string',
      title: 'Ratio',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
