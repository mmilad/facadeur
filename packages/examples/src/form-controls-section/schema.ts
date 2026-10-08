import type { JsonSchemaObject } from '@facadeur/domain';

export const schema = {
  type: 'object',
  properties: {
    formFields: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'kind', 'label'],
        properties: {
          id: {
            type: 'string',
          },
          kind: {
            type: 'string',
            enum: ['input', 'textarea', 'select', 'toggle'],
          },
          label: {
            type: 'string',
          },
          value: {
            type: 'string',
          },
          placeholder: {
            type: 'string',
          },
          hint: {
            type: 'string',
          },
          rows: {
            type: 'number',
          },
        },
        additionalProperties: false,
      },
      default: [
        {
          id: 'name',
          kind: 'input',
          label: 'Name',
          placeholder: 'Your name',
        },
        {
          id: 'message',
          kind: 'textarea',
          label: 'Message',
          rows: 3,
        },
        {
          id: 'property',
          kind: 'select',
          label: 'Property',
        },
        {
          id: 'enabled',
          kind: 'toggle',
          label: 'Use token',
        },
      ],
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
