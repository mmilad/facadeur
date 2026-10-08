import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
    },
    placeholder: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
    disabled: {
      type: 'boolean',
    },
    rows: {
      type: 'number',
      default: 3,
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
