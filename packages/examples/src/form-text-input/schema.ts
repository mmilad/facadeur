import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
    },
    hint: {
      type: 'string',
    },
    icon: {
      type: 'string',
    },
    hasIcon: {
      type: 'boolean',
    },
    state: {
      type: 'string',
      enum: ['default', 'focused', 'disabled', 'invalid'],
      default: 'default',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
