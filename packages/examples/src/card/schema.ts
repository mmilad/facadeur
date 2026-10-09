import type { JsonSchemaObject } from '@facadeur/domain';
import { ids as exampleCardIds } from './idList';

export const propIds = {
  eyebrow: exampleCardIds.props.eyebrow,
  title: exampleCardIds.props.title,
  body: exampleCardIds.props.body,
} as const;

export const schema = {
  type: 'object',
  properties: {
    eyebrow: {
      type: 'string',
      'x-facadeur-prop-id': propIds.eyebrow,
    },
    title: {
      type: 'string',
      'x-facadeur-prop-id': propIds.title,
    },
    body: {
      type: 'string',
      'x-facadeur-prop-id': propIds.body,
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
