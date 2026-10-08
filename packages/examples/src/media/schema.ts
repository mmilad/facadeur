import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  required: ['kind', 'src'],
  properties: {
    kind: {
      type: 'string',
      enum: ['image', 'video'],
      default: 'image',
    },
    src: {
      type: 'string',
    },
    alt: {
      type: 'string',
    },
    poster: {
      type: 'string',
    },
    ratio: {
      type: 'string',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
