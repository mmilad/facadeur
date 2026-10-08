import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    checked: {
      type: 'boolean',
    },
    value: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    disabled: {
      type: 'boolean',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
