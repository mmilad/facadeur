import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
    },
    value: {
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
