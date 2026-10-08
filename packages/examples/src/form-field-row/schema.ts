import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    type: {
      type: 'string',
    },
    value: {
      type: 'string',
    },
    state: {
      type: 'string',
      enum: ['default', 'selected'],
      default: 'default',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
