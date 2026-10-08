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
      enum: ['default', 'focused', 'disabled'],
      default: 'default',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
