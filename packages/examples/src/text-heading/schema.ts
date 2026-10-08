import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  required: ['text'],
  properties: {
    text: {
      type: 'string',
      default: '',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
