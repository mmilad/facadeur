import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
    },
    state: {
      type: 'string',
      enum: ['start', 'center', 'end'],
      default: 'start',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
