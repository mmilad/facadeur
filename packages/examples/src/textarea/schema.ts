import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  title: 'Textarea',
  properties: {
    label: {
      type: 'string',
      title: 'Label',
    },
    value: {
      type: 'string',
      title: 'Value',
    },
    placeholder: {
      type: 'string',
      title: 'Placeholder',
    },
    name: {
      type: 'string',
      title: 'Name',
    },
    rows: {
      type: 'number',
      title: 'Rows',
    },
    resize: {
      type: 'string',
      enum: ['vertical', 'none'],
      default: 'vertical',
    },
  },
} satisfies JsonSchemaObject;
