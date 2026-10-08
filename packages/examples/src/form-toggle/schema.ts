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
    state: {
      type: 'string',
      enum: ['on', 'off', 'disabled'],
      default: 'on',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
