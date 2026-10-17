import type { JsonSchemaObject } from '@facadeur/domain';
import { ids as iconIds } from './idList';

export const propIds = {
  icon: iconIds.props.icon,
} as const;

export const schema = {
  type: 'object',
  title: 'Icon',
  required: ['icon'],
  properties: {
    icon: {
      type: 'string',
      title: 'Icon',
      default: 'save',
      'x-facadeur-reference': { target: 'icon' },
      'x-facadeur-prop-id': propIds.icon,
    },
  },
  additionalProperties: false,
} satisfies JsonSchemaObject;
