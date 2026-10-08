import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        required: ['value', 'label'],
        properties: {
          value: {
            type: 'string',
          },
          label: {
            type: 'string',
          },
          disabled: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
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
