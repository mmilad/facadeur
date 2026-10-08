import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        required: ['label', 'value'],
        properties: {
          label: {
            type: 'string',
          },
          value: {
            type: 'string',
          },
          disabled: {
            type: 'boolean',
          },
          checked: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    },
    name: {
      type: 'string',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
