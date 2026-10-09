import type { JsonSchemaObject } from '@facadeur/domain';
import { ids as exampleImageIds } from './idList';

export const schemaUuid = exampleImageIds.schema;
export const propIds = {
  src: exampleImageIds.props.src,
  alt: exampleImageIds.props.alt,
  ratio: exampleImageIds.props.ratio,
} as const;

export const schema = {
  type: 'object',
  title: 'Image',
  required: ['src'],
  properties: {
    src: {
      type: 'string',
      title: 'Source',
      'x-facadeur-prop-id': propIds.src,
    },
    alt: {
      type: 'string',
      title: 'Alt text',
      'x-facadeur-prop-id': propIds.alt,
    },
    ratio: {
      type: 'string',
      title: 'Ratio',
      'x-facadeur-prop-id': propIds.ratio,
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
