import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
    },
    tone: {
      type: 'string',
      enum: ['primary', 'secondary', 'ghost'],
      default: 'primary',
    },
    size: {
      type: 'string',
      enum: ['sm', 'md'],
      default: 'md',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
