import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
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
    name: {
      type: 'string',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
