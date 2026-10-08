import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
    },
    price: {
      type: 'string',
    },
    imageSrc: {
      type: 'string',
    },
    imageAlt: {
      type: 'string',
    },
    buttonLabel: {
      type: 'string',
    },
    default: {
      type: 'string',
      enum: [],
    },
    compact: {
      type: 'string',
      enum: [],
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
