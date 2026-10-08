import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    label: {
      type: 'string',
    },
    href: {
      type: 'string',
    },
    tone: {
      type: 'string',
      enum: ['default', 'muted'],
      default: 'default',
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
